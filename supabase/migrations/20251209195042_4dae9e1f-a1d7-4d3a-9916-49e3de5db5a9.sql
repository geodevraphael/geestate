-- Drop and recreate with proper ray-casting point-in-polygon algorithm
CREATE OR REPLACE FUNCTION public.find_ward_by_point(lat double precision, lng double precision)
RETURNS TABLE(
  ward_id uuid,
  ward_name text,
  district_id uuid,
  district_name text,
  region_id uuid,
  region_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  coords jsonb;
  ring jsonb;
  n int;
  i int;
  x1 double precision;
  y1 double precision;
  x2 double precision;
  y2 double precision;
  inside boolean;
BEGIN
  -- Loop through wards with geometry
  FOR rec IN 
    SELECT 
      w.id,
      w.name,
      w.geometry,
      d.id as dist_id,
      d.name as dist_name,
      r.id as reg_id,
      r.name as reg_name
    FROM wards w
    JOIN districts d ON w.district_id = d.id
    JOIN regions r ON d.region_id = r.id
    WHERE w.geometry IS NOT NULL
      AND w.geometry->>'type' = 'Polygon'
  LOOP
    -- Get the outer ring (first array in coordinates)
    ring := rec.geometry->'coordinates'->0;
    n := jsonb_array_length(ring);
    
    IF n < 4 THEN
      CONTINUE;
    END IF;
    
    -- Ray-casting algorithm for point-in-polygon
    inside := false;
    
    FOR i IN 0..(n-2) LOOP
      -- Get current vertex (note: GeoJSON is [lng, lat])
      x1 := (ring->i->0)::double precision;
      y1 := (ring->i->1)::double precision;
      -- Get next vertex
      x2 := (ring->(i+1)->0)::double precision;
      y2 := (ring->(i+1)->1)::double precision;
      
      -- Ray casting check
      IF ((y1 > lat) != (y2 > lat)) AND 
         (lng < (x2 - x1) * (lat - y1) / (y2 - y1) + x1) THEN
        inside := NOT inside;
      END IF;
    END LOOP;
    
    IF inside THEN
      ward_id := rec.id;
      ward_name := rec.name;
      district_id := rec.dist_id;
      district_name := rec.dist_name;
      region_id := rec.reg_id;
      region_name := rec.reg_name;
      RETURN NEXT;
      RETURN;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;