import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import * as turf from 'https://esm.sh/@turf/turf@7.2.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SpatialRiskRequest {
  listing_id: string;
  geojson: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { listing_id, geojson }: SpatialRiskRequest = await req.json();

    console.log('Calculating spatial risk for listing:', listing_id);

    if (!listing_id || !geojson) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const polygon = turf.polygon(geojson.coordinates);
    const area = turf.area(polygon);
    const centroid = turf.centroid(polygon);
    const [lng, lat] = centroid.geometry.coordinates;

    console.log('Property centroid:', { lat, lng, area_m2: area });

    // ============= STEP 1: QUERY OVERPASS API FOR RIVERS/WATERWAYS =============
    let near_river = false;
    let distance_to_river_m: number | null = null;
    let nearest_river_name: string | null = null;

    try {
      // Search for rivers within 10km radius
      const overpassQuery = `
        [out:json][timeout:25];
        (
          way["waterway"="river"](around:10000,${lat},${lng});
          way["natural"="water"]["water"="river"](around:10000,${lat},${lng});
        );
        out center;
      `;

      const overpassResponse = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(overpassQuery)}`,
      });

      if (overpassResponse.ok) {
        const riverData = await overpassResponse.json();
        console.log('Found rivers:', riverData.elements.length);

        if (riverData.elements && riverData.elements.length > 0) {
          // Find nearest river
          let minDistance = Infinity;
          
          for (const element of riverData.elements) {
            if (element.center || (element.lat && element.lon)) {
              const riverLat = element.center?.lat || element.lat;
              const riverLng = element.center?.lon || element.lon;
              const riverPoint = turf.point([riverLng, riverLat]);
              const distance = turf.distance(centroid, riverPoint, { units: 'meters' });
              
              if (distance < minDistance) {
                minDistance = distance;
                nearest_river_name = element.tags?.name || 'Unnamed River';
              }
            }
          }

          if (minDistance < Infinity) {
            near_river = true;
            distance_to_river_m = Math.round(minDistance);
            console.log('Nearest river:', nearest_river_name, 'Distance:', distance_to_river_m, 'm');
          }
        }
      }
    } catch (error) {
      console.error('Overpass API error:', error);
    }

    // ============= STEP 2: GET REAL ELEVATION DATA =============
    let elevation_m: number | null = null;
    let slope_percent: number | null = null;

    try {
      // Get elevation at centroid
      const elevationResponse = await fetch(
        `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`
      );

      if (elevationResponse.ok) {
        const elevationData = await elevationResponse.json();
        if (elevationData.results && elevationData.results.length > 0) {
          elevation_m = elevationData.results[0].elevation;
          console.log('Elevation at centroid:', elevation_m, 'm');

          // Get elevation at 4 corners to calculate slope
          const bbox = turf.bbox(polygon);
          const corners = [
            [bbox[0], bbox[1]], // SW
            [bbox[2], bbox[1]], // SE
            [bbox[2], bbox[3]], // NE
            [bbox[0], bbox[3]], // NW
          ];

          const cornerElevations = await Promise.all(
            corners.map(async ([lng, lat]) => {
              try {
                const resp = await fetch(
                  `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`
                );
                const data = await resp.json();
                return data.results?.[0]?.elevation || elevation_m;
              } catch {
                return elevation_m;
              }
            })
          );

          // Calculate slope as max elevation difference / distance
          const maxElevDiff = Math.max(...cornerElevations) - Math.min(...cornerElevations);
          const diagonalDistance = turf.distance(
            turf.point([bbox[0], bbox[1]]),
            turf.point([bbox[2], bbox[3]]),
            { units: 'meters' }
          );
          slope_percent = (maxElevDiff / diagonalDistance) * 100;
          console.log('Calculated slope:', slope_percent.toFixed(2), '%');
        }
      }
    } catch (error) {
      console.error('Open-Elevation API error:', error);
    }

    // ============= STEP 3: CALCULATE FLOOD RISK SCORE =============
    let flood_risk_score = 20; // base score

    // River proximity risk
    if (near_river && distance_to_river_m !== null) {
      if (distance_to_river_m < 100) {
        flood_risk_score += 40; // Very close to river
      } else if (distance_to_river_m < 500) {
        flood_risk_score += 30;
      } else if (distance_to_river_m < 1000) {
        flood_risk_score += 20;
      } else if (distance_to_river_m < 3000) {
        flood_risk_score += 10;
      }
    }

    // Elevation-based risk
    if (elevation_m !== null) {
      if (elevation_m < 100) {
        flood_risk_score += 25; // Very low-lying
      } else if (elevation_m < 300) {
        flood_risk_score += 15;
      } else if (elevation_m < 600) {
        flood_risk_score += 5;
      }
    }

    // Slope-based risk (flat terrain = higher risk)
    if (slope_percent !== null) {
      if (slope_percent < 1) {
        flood_risk_score += 20; // Very flat
      } else if (slope_percent < 3) {
        flood_risk_score += 10;
      } else if (slope_percent < 5) {
        flood_risk_score += 5;
      }
    }

    // Area-based risk
    if (area > 50000) {
      flood_risk_score += 10; // Large areas accumulate more water
    }

    // Determine risk level
    let flood_risk_level: 'low' | 'medium' | 'high' | 'unknown' = 'low';
    if (flood_risk_score >= 70) {
      flood_risk_level = 'high';
    } else if (flood_risk_score >= 40) {
      flood_risk_level = 'medium';
    }

    const environmental_notes = near_river
      ? `Real geographic data from OpenStreetMap and Open-Elevation. Nearest water body: ${nearest_river_name} at ${distance_to_river_m}m. Elevation: ${elevation_m}m. Consider consulting Tanzania Water Basin Management for detailed flood zone mapping.`
      : `Real geographic data from OpenStreetMap and Open-Elevation. No major rivers within 10km radius. Elevation: ${elevation_m}m. Low flood risk from river overflow.`;

    // Insert or update spatial risk profile
    const { data, error } = await supabase
      .from('spatial_risk_profiles')
      .upsert({
        listing_id,
        flood_risk_level,
        flood_risk_score: Math.min(100, Math.max(0, Math.round(flood_risk_score))),
        near_river,
        distance_to_river_m,
        elevation_m: elevation_m !== null ? Math.round(elevation_m) : null,
        slope_percent: slope_percent !== null ? Math.round(slope_percent * 10) / 10 : null,
        environmental_notes,
        calculated_at: new Date().toISOString(),
      }, {
        onConflict: 'listing_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting spatial risk profile:', error);
      throw error;
    }

    console.log('Spatial risk profile created/updated:', data);

    return new Response(
      JSON.stringify({ success: true, profile: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in calculate-spatial-risk:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
