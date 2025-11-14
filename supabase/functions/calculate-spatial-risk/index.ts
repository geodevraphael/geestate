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

    // Mock flood risk calculation based on area and centroid location
    // In production, this would call real elevation/flood zone APIs
    let flood_risk_score = 30; // base score
    let flood_risk_level: 'low' | 'medium' | 'high' | 'unknown' = 'low';
    let near_river = false;
    let distance_to_river_m: number | null = null;

    // Mock: Larger areas near coastlines (lower latitudes) have higher flood risk
    const lat = centroid.geometry.coordinates[1];
    if (lat < -6) {
      // Southern Tanzania, near water bodies
      flood_risk_score += 30;
      near_river = Math.random() > 0.5;
      if (near_river) {
        distance_to_river_m = Math.floor(Math.random() * 5000) + 100; // 100-5000m
        flood_risk_score += Math.max(0, 40 - (distance_to_river_m / 100));
      }
    }

    // Area-based risk: larger low-lying areas accumulate water
    if (area > 50000) {
      // > 5 hectares
      flood_risk_score += 10;
    }

    // Mock elevation (in production, use DEM API)
    const elevation_m = 100 + Math.random() * 1400; // Tanzania: 0-2895m
    if (elevation_m < 200) {
      flood_risk_score += 20;
    } else if (elevation_m < 500) {
      flood_risk_score += 10;
    }

    // Mock slope calculation
    const slope_percent = Math.random() * 30;
    if (slope_percent < 2) {
      // Flat terrain retains water
      flood_risk_score += 15;
    }

    // Determine risk level
    if (flood_risk_score >= 70) {
      flood_risk_level = 'high';
    } else if (flood_risk_score >= 40) {
      flood_risk_level = 'medium';
    } else {
      flood_risk_level = 'low';
    }

    const environmental_notes = `Mock risk assessment. In production, integrate with Tanzania Meteorological Authority and Water Basin Management APIs.`;

    // Insert or update spatial risk profile
    const { data, error } = await supabase
      .from('spatial_risk_profiles')
      .upsert({
        listing_id,
        flood_risk_level,
        flood_risk_score: Math.min(100, Math.max(0, Math.round(flood_risk_score))),
        near_river,
        distance_to_river_m,
        elevation_m: Math.round(elevation_m),
        slope_percent: Math.round(slope_percent * 10) / 10,
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
