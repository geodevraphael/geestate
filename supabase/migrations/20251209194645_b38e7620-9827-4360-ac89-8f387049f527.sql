-- Create a fast spatial lookup function using bounding box + point-in-polygon
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
  point_geojson jsonb;
BEGIN
  -- Create a GeoJSON point
  point_geojson := jsonb_build_object(
    'type', 'Point',
    'coordinates', jsonb_build_array(lng, lat)
  );

  -- Find ward containing the point using bounding box pre-filter
  RETURN QUERY
  SELECT 
    w.id as ward_id,
    w.name as ward_name,
    d.id as district_id,
    d.name as district_name,
    r.id as region_id,
    r.name as region_name
  FROM wards w
  JOIN districts d ON w.district_id = d.id
  JOIN regions r ON d.region_id = r.id
  WHERE w.geometry IS NOT NULL
    -- Bounding box pre-filter (fast)
    AND (
      lng >= (w.geometry->'coordinates'->0->0->0)::float
      AND lng <= (w.geometry->'coordinates'->0->2->0)::float
      AND lat >= (w.geometry->'coordinates'->0->0->1)::float
      AND lat <= (w.geometry->'coordinates'->0->2->1)::float
    )
    -- Point-in-polygon check using jsonb containment approximation
    OR w.geometry @> point_geojson
  LIMIT 1;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.find_ward_by_point(double precision, double precision) TO anon, authenticated;