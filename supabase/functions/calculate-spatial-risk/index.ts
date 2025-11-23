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

    console.log('🔍 Starting comprehensive flood risk analysis for:', { lat, lng, area_m2: area });

    // Data availability tracking
    const dataAvailability = {
      rivers: false,
      lakes: false,
      wetlands: false,
      drainage: false,
      elevation: false,
      slope: false,
      floodZones: false,
      landUse: false,
    };

    // Risk factors found
    const riskFactors: string[] = [];
    const protectiveFactors: string[] = [];

    // ============= STEP 1: COMPREHENSIVE WATER BODY ANALYSIS =============
    let near_river = false;
    let distance_to_river_m: number | null = null;
    let nearest_river_name: string | null = null;
    let water_bodies_nearby = 0;
    let nearest_lake_distance: number | null = null;
    let wetlands_nearby = 0;
    let drainage_systems_nearby = 0;

    try {
      // Query ALL water-related features within 5km
      const overpassQuery = `
        [out:json][timeout:30];
        (
          way["waterway"="river"](around:5000,${lat},${lng});
          way["waterway"="stream"](around:5000,${lat},${lng});
          way["natural"="water"](around:5000,${lat},${lng});
          way["water"="lake"](around:5000,${lat},${lng});
          way["water"="pond"](around:5000,${lat},${lng});
          way["water"="reservoir"](around:5000,${lat},${lng});
          way["natural"="wetland"](around:3000,${lat},${lng});
          way["landuse"="basin"](around:3000,${lat},${lng});
          way["waterway"="drain"](around:2000,${lat},${lng});
          way["waterway"="ditch"](around:2000,${lat},${lng});
          node["natural"="spring"](around:1000,${lat},${lng});
        );
        out center;
      `;

      console.log('⏳ Querying Overpass API for water features...');
      const overpassResponse = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(overpassQuery)}`,
      });

      if (overpassResponse.ok) {
        const waterData = await overpassResponse.json();
        console.log('✅ Found water features:', waterData.elements.length);

        // Categorize water features
        let minRiverDistance = Infinity;
        let minLakeDistance = Infinity;

        for (const element of waterData.elements) {
          if (element.center || (element.lat && element.lon)) {
            const eleLat = element.center?.lat || element.lat;
            const eleLng = element.center?.lon || element.lon;
            const elePoint = turf.point([eleLng, eleLat]);
            const distance = turf.distance(centroid, elePoint, { units: 'meters' });
            
            const waterway = element.tags?.waterway;
            const natural = element.tags?.natural;
            const water = element.tags?.water;
            const landuse = element.tags?.landuse;

            // Rivers and streams
            if (waterway === 'river' || waterway === 'stream') {
              if (distance < minRiverDistance) {
                minRiverDistance = distance;
                nearest_river_name = element.tags?.name || `Unnamed ${waterway}`;
                dataAvailability.rivers = true;
              }
            }

            // Lakes and ponds
            if (natural === 'water' || water === 'lake' || water === 'pond' || water === 'reservoir') {
              water_bodies_nearby++;
              if (distance < minLakeDistance) {
                minLakeDistance = distance;
                dataAvailability.lakes = true;
              }
            }

            // Wetlands
            if (natural === 'wetland' || landuse === 'basin') {
              wetlands_nearby++;
              dataAvailability.wetlands = true;
            }

            // Drainage systems
            if (waterway === 'drain' || waterway === 'ditch') {
              drainage_systems_nearby++;
              dataAvailability.drainage = true;
            }
          }
        }

        if (minRiverDistance < Infinity) {
          near_river = true;
          distance_to_river_m = Math.round(minRiverDistance);
        }

        if (minLakeDistance < Infinity) {
          nearest_lake_distance = Math.round(minLakeDistance);
        }

        console.log('📊 Water analysis:', {
          rivers: dataAvailability.rivers,
          distance_to_river: distance_to_river_m,
          lakes: water_bodies_nearby,
          wetlands: wetlands_nearby,
          drainage: drainage_systems_nearby,
        });
      }
    } catch (error) {
      console.error('❌ Overpass API error:', error);
    }

    // ============= STEP 2: ELEVATION & TERRAIN ANALYSIS =============
    let elevation_m: number | null = null;
    let slope_percent: number | null = null;
    let terrain_variation: number | null = null;

    try {
      console.log('⏳ Querying Open-Elevation API...');
      const elevationResponse = await fetch(
        `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`
      );

      if (elevationResponse.ok) {
        const elevationData = await elevationResponse.json();
        if (elevationData.results && elevationData.results.length > 0) {
          elevation_m = elevationData.results[0].elevation;
          dataAvailability.elevation = true;
          console.log('✅ Elevation:', elevation_m, 'm');

          // Sample 8 points around property for better terrain analysis
          const bbox = turf.bbox(polygon);
          const samplePoints = [
            [bbox[0], bbox[1]], // SW
            [(bbox[0] + bbox[2]) / 2, bbox[1]], // S
            [bbox[2], bbox[1]], // SE
            [bbox[2], (bbox[1] + bbox[3]) / 2], // E
            [bbox[2], bbox[3]], // NE
            [(bbox[0] + bbox[2]) / 2, bbox[3]], // N
            [bbox[0], bbox[3]], // NW
            [bbox[0], (bbox[1] + bbox[3]) / 2], // W
          ];

          const elevations = await Promise.all(
            samplePoints.map(async ([lng, lat]) => {
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

          const validElevations = elevations.filter(e => e !== null) as number[];
          const maxElev = Math.max(...validElevations);
          const minElev = Math.min(...validElevations);
          terrain_variation = maxElev - minElev;

          // Calculate average slope
          const diagonalDistance = turf.distance(
            turf.point([bbox[0], bbox[1]]),
            turf.point([bbox[2], bbox[3]]),
            { units: 'meters' }
          );
          slope_percent = (terrain_variation / diagonalDistance) * 100;
          dataAvailability.slope = true;

          console.log('✅ Terrain analysis:', {
            elevation: elevation_m,
            variation: terrain_variation,
            slope: slope_percent.toFixed(2),
          });
        }
      }
    } catch (error) {
      console.error('❌ Open-Elevation API error:', error);
    }

    // ============= STEP 3: LAND USE & FLOOD ZONE CHECK =============
    let flood_prone_nearby = false;
    let agricultural_land = false;
    let developed_area = false;

    try {
      const landUseQuery = `
        [out:json][timeout:25];
        (
          way["landuse"="floodplain"](around:2000,${lat},${lng});
          way["natural"="floodplain"](around:2000,${lat},${lng});
          way["landuse"="farmland"](around:500,${lat},${lng});
          way["landuse"="residential"](around:500,${lat},${lng});
          way["landuse"="commercial"](around:500,${lat},${lng});
        );
        out;
      `;

      const landUseResponse = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(landUseQuery)}`,
      });

      if (landUseResponse.ok) {
        const landUseData = await landUseResponse.json();
        for (const element of landUseData.elements) {
          const landuse = element.tags?.landuse;
          const natural = element.tags?.natural;
          
          if (landuse === 'floodplain' || natural === 'floodplain') {
            flood_prone_nearby = true;
            dataAvailability.floodZones = true;
          }
          if (landuse === 'farmland') {
            agricultural_land = true;
            dataAvailability.landUse = true;
          }
          if (landuse === 'residential' || landuse === 'commercial') {
            developed_area = true;
            dataAvailability.landUse = true;
          }
        }
      }
    } catch (error) {
      console.error('❌ Land use query error:', error);
    }

    // ============= STEP 4: CALCULATE COMPREHENSIVE FLOOD RISK SCORE =============
    let flood_risk_score = 0;

    // 1. River Proximity Risk (0-35 points)
    if (near_river && distance_to_river_m !== null) {
      if (distance_to_river_m < 50) {
        flood_risk_score += 35;
        riskFactors.push(`Extremely close to ${nearest_river_name} (${distance_to_river_m}m) - Very high overflow risk`);
      } else if (distance_to_river_m < 100) {
        flood_risk_score += 30;
        riskFactors.push(`Very close to ${nearest_river_name} (${distance_to_river_m}m) - High overflow risk`);
      } else if (distance_to_river_m < 250) {
        flood_risk_score += 25;
        riskFactors.push(`Close to ${nearest_river_name} (${distance_to_river_m}m) - Moderate overflow risk`);
      } else if (distance_to_river_m < 500) {
        flood_risk_score += 15;
        riskFactors.push(`Near ${nearest_river_name} (${distance_to_river_m}m) - Flood zone consideration`);
      } else if (distance_to_river_m < 1000) {
        flood_risk_score += 8;
        riskFactors.push(`Proximity to ${nearest_river_name} (${distance_to_river_m}m) - Low overflow risk`);
      } else {
        protectiveFactors.push(`Safe distance from ${nearest_river_name} (${distance_to_river_m}m)`);
      }
    }

    // 2. Standing Water Bodies Risk (0-20 points)
    if (water_bodies_nearby > 0) {
      if (nearest_lake_distance !== null && nearest_lake_distance < 200) {
        flood_risk_score += 20;
        riskFactors.push(`${water_bodies_nearby} water bodies nearby, closest at ${nearest_lake_distance}m`);
      } else if (nearest_lake_distance !== null && nearest_lake_distance < 500) {
        flood_risk_score += 12;
        riskFactors.push(`${water_bodies_nearby} water bodies within 500m`);
      } else {
        flood_risk_score += 5;
      }
    }

    // 3. Wetlands Proximity (0-15 points)
    if (wetlands_nearby > 0) {
      flood_risk_score += Math.min(15, wetlands_nearby * 5);
      riskFactors.push(`${wetlands_nearby} wetland/basin areas nearby - Poor natural drainage`);
    }

    // 4. Elevation Risk (0-25 points)
    if (elevation_m !== null) {
      if (elevation_m < 50) {
        flood_risk_score += 25;
        riskFactors.push(`Very low elevation (${Math.round(elevation_m)}m) - Extreme flood risk`);
      } else if (elevation_m < 150) {
        flood_risk_score += 18;
        riskFactors.push(`Low elevation (${Math.round(elevation_m)}m) - High flood susceptibility`);
      } else if (elevation_m < 300) {
        flood_risk_score += 12;
        riskFactors.push(`Moderate elevation (${Math.round(elevation_m)}m) - Moderate flood risk`);
      } else if (elevation_m < 600) {
        flood_risk_score += 5;
        riskFactors.push(`Elevated terrain (${Math.round(elevation_m)}m) - Reduced flood risk`);
      } else {
        protectiveFactors.push(`High elevation (${Math.round(elevation_m)}m) - Natural protection`);
      }
    }

    // 5. Slope & Drainage (0-20 points)
    if (slope_percent !== null) {
      if (slope_percent < 0.5) {
        flood_risk_score += 20;
        riskFactors.push(`Nearly flat terrain (${slope_percent.toFixed(1)}% slope) - Very poor water runoff`);
      } else if (slope_percent < 1.5) {
        flood_risk_score += 15;
        riskFactors.push(`Very gentle slope (${slope_percent.toFixed(1)}%) - Poor drainage`);
      } else if (slope_percent < 3) {
        flood_risk_score += 8;
        riskFactors.push(`Gentle slope (${slope_percent.toFixed(1)}%) - Moderate drainage`);
      } else if (slope_percent < 5) {
        flood_risk_score += 3;
      } else {
        protectiveFactors.push(`Good slope (${slope_percent.toFixed(1)}%) - Natural water runoff`);
      }
    }

    // 6. Drainage Systems (Protective: -5 to -10 points)
    if (drainage_systems_nearby > 0) {
      const reduction = Math.min(10, drainage_systems_nearby * 3);
      flood_risk_score -= reduction;
      protectiveFactors.push(`${drainage_systems_nearby} drainage systems nearby - Reduces flood risk`);
    }

    // 7. Known Flood Zones (0-15 points)
    if (flood_prone_nearby) {
      flood_risk_score += 15;
      riskFactors.push('Located in or near mapped floodplain area');
      dataAvailability.floodZones = true;
    }

    // 8. Property Size Factor (0-5 points)
    if (area > 100000) {
      flood_risk_score += 5;
      riskFactors.push(`Large property (${(area / 10000).toFixed(1)} hectares) - More water accumulation`);
    } else if (area > 50000) {
      flood_risk_score += 3;
    }

    // 9. Development Context (Protective: -5 points)
    if (developed_area) {
      flood_risk_score -= 5;
      protectiveFactors.push('Located in developed area with likely drainage infrastructure');
    }

    // Ensure score is within bounds
    flood_risk_score = Math.min(100, Math.max(0, Math.round(flood_risk_score)));

    // Determine risk level with more nuanced thresholds
    let flood_risk_level: 'low' | 'medium' | 'high' | 'unknown' = 'unknown';
    if (flood_risk_score >= 60) {
      flood_risk_level = 'high';
    } else if (flood_risk_score >= 30) {
      flood_risk_level = 'medium';
    } else {
      flood_risk_level = 'low';
    }

    // Build comprehensive environmental notes
    const dataSourcesSummary = Object.entries(dataAvailability)
      .filter(([_, available]) => available)
      .map(([source, _]) => source)
      .join(', ');

    let environmental_notes = `DATA SOURCES: ${dataSourcesSummary || 'Limited data available'}\n\n`;
    
    if (riskFactors.length > 0) {
      environmental_notes += `RISK FACTORS:\n${riskFactors.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n\n`;
    }
    
    if (protectiveFactors.length > 0) {
      environmental_notes += `PROTECTIVE FACTORS:\n${protectiveFactors.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n\n`;
    }

    environmental_notes += `RECOMMENDATION: ${
      flood_risk_level === 'high' 
        ? 'High flood risk detected. Consult with Tanzania Water Basin Management Authority for detailed flood zone mapping and mitigation strategies. Consider flood insurance and elevated construction.'
        : flood_risk_level === 'medium'
        ? 'Moderate flood risk. Verify with local authorities about historical flooding patterns. Proper drainage and elevated foundation recommended.'
        : 'Low flood risk based on available data. Standard drainage precautions advised.'
    }`;

    console.log('📊 Final Risk Assessment:', {
      score: flood_risk_score,
      level: flood_risk_level,
      risk_factors: riskFactors.length,
      protective_factors: protectiveFactors.length,
      data_completeness: Object.values(dataAvailability).filter(Boolean).length + '/8',
    });

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
