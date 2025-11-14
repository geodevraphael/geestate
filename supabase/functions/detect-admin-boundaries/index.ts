import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import * as turf from 'https://esm.sh/@turf/turf@7.2.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdminBoundaries {
  region_id: string | null;
  district_id: string | null;
  ward_id: string | null;
  street_village_id: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { polygon } = await req.json();

    if (!polygon || !polygon.geometry) {
      throw new Error('Invalid polygon data');
    }

    console.log('Detecting administrative boundaries for polygon');

    const result: AdminBoundaries = {
      region_id: null,
      district_id: null,
      ward_id: null,
      street_village_id: null,
    };

    // Convert input polygon to Turf feature
    const inputPolygon = turf.feature(polygon.geometry);
    const inputCentroid = turf.centroid(inputPolygon);

    // 1. Detect Region
    const { data: regions, error: regionsError } = await supabase
      .from('regions')
      .select('id, name, geometry');

    if (regionsError) {
      console.error('Error fetching regions:', regionsError);
    } else if (regions) {
      for (const region of regions) {
        if (region.geometry) {
          try {
            const regionGeometry = typeof region.geometry === 'string' 
              ? JSON.parse(region.geometry) 
              : region.geometry;
            
            const regionFeature = turf.feature(regionGeometry);
            
            // Check if centroid is within region or if polygons intersect
            const centroidInRegion = turf.booleanPointInPolygon(inputCentroid, regionFeature);
            const polygonsIntersect = turf.booleanIntersects(inputPolygon, regionFeature);
            
            if (centroidInRegion || polygonsIntersect) {
              result.region_id = region.id;
              console.log(`Matched region: ${region.name}`);
              break;
            }
          } catch (e) {
            console.error(`Error processing region ${region.name}:`, e);
          }
        }
      }
    }

    // 2. Detect District (if region found)
    if (result.region_id) {
      const { data: districts, error: districtsError } = await supabase
        .from('districts')
        .select('id, name, geometry, region_id')
        .eq('region_id', result.region_id);

      if (districtsError) {
        console.error('Error fetching districts:', districtsError);
      } else if (districts) {
        for (const district of districts) {
          if (district.geometry) {
            try {
              const districtGeometry = typeof district.geometry === 'string' 
                ? JSON.parse(district.geometry) 
                : district.geometry;
              
              const districtFeature = turf.feature(districtGeometry);
              
              const centroidInDistrict = turf.booleanPointInPolygon(inputCentroid, districtFeature);
              const polygonsIntersect = turf.booleanIntersects(inputPolygon, districtFeature);
              
              if (centroidInDistrict || polygonsIntersect) {
                result.district_id = district.id;
                console.log(`Matched district: ${district.name}`);
                break;
              }
            } catch (e) {
              console.error(`Error processing district ${district.name}:`, e);
            }
          }
        }
      }
    }

    // 3. Detect Ward (if district found)
    if (result.district_id) {
      const { data: wards, error: wardsError } = await supabase
        .from('wards')
        .select('id, name, geometry, district_id')
        .eq('district_id', result.district_id);

      if (wardsError) {
        console.error('Error fetching wards:', wardsError);
      } else if (wards) {
        for (const ward of wards) {
          if (ward.geometry) {
            try {
              const wardGeometry = typeof ward.geometry === 'string' 
                ? JSON.parse(ward.geometry) 
                : ward.geometry;
              
              const wardFeature = turf.feature(wardGeometry);
              
              const centroidInWard = turf.booleanPointInPolygon(inputCentroid, wardFeature);
              const polygonsIntersect = turf.booleanIntersects(inputPolygon, wardFeature);
              
              if (centroidInWard || polygonsIntersect) {
                result.ward_id = ward.id;
                console.log(`Matched ward: ${ward.name}`);
                break;
              }
            } catch (e) {
              console.error(`Error processing ward ${ward.name}:`, e);
            }
          }
        }
      }
    }

    // 4. Detect Street/Village (if ward found)
    if (result.ward_id) {
      const { data: streets, error: streetsError } = await supabase
        .from('streets_villages')
        .select('id, name, geometry, ward_id')
        .eq('ward_id', result.ward_id);

      if (streetsError) {
        console.error('Error fetching streets/villages:', streetsError);
      } else if (streets) {
        for (const street of streets) {
          if (street.geometry) {
            try {
              const streetGeometry = typeof street.geometry === 'string' 
                ? JSON.parse(street.geometry) 
                : street.geometry;
              
              const streetFeature = turf.feature(streetGeometry);
              
              const centroidInStreet = turf.booleanPointInPolygon(inputCentroid, streetFeature);
              const polygonsIntersect = turf.booleanIntersects(inputPolygon, streetFeature);
              
              if (centroidInStreet || polygonsIntersect) {
                result.street_village_id = street.id;
                console.log(`Matched street/village: ${street.name}`);
                break;
              }
            } catch (e) {
              console.error(`Error processing street/village ${street.name}:`, e);
            }
          }
        }
      }
    }

    console.log('Detection complete:', result);

    return new Response(
      JSON.stringify({ success: true, boundaries: result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in detect-admin-boundaries:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});