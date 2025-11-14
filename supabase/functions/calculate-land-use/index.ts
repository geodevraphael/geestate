import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import * as turf from 'https://esm.sh/@turf/turf@7.2.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LandUseRequest {
  listing_id: string;
  property_type: string;
  region?: string;
  district?: string;
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

    const { listing_id, property_type, region, district, geojson }: LandUseRequest = await req.json();

    console.log('Calculating land use for listing:', listing_id);

    if (!listing_id || !property_type || !geojson) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const polygon = turf.polygon(geojson.coordinates);
    const area = turf.area(polygon);

    // Mock land use determination (in production, overlay with official zoning data)
    let dominant_land_use = 'mixed';
    let allowed_uses: string[] = [];
    let zoning_code = 'UNK';
    let land_use_conflict = false;

    // Rule-based mock logic
    if (region && region.toLowerCase().includes('dar es salaam')) {
      // Urban area
      if (area < 10000) {
        // < 1 hectare
        dominant_land_use = 'residential';
        allowed_uses = ['residential', 'mixed'];
        zoning_code = 'R2';
      } else {
        dominant_land_use = 'commercial';
        allowed_uses = ['commercial', 'mixed', 'industrial'];
        zoning_code = 'C1';
      }
    } else if (region && (region.toLowerCase().includes('arusha') || region.toLowerCase().includes('kilimanjaro'))) {
      // Tourist/agricultural regions
      dominant_land_use = 'agricultural';
      allowed_uses = ['agricultural', 'residential', 'tourism'];
      zoning_code = 'AG1';
    } else if (area > 100000) {
      // > 10 hectares - likely agricultural
      dominant_land_use = 'agricultural';
      allowed_uses = ['agricultural', 'farming', 'ranching'];
      zoning_code = 'AG2';
    } else {
      // Mixed use
      dominant_land_use = 'mixed';
      allowed_uses = ['residential', 'commercial', 'agricultural'];
      zoning_code = 'MX1';
    }

    // Check for land use conflicts
    if (property_type === 'industrial' && dominant_land_use === 'residential') {
      land_use_conflict = true;
    } else if (property_type === 'commercial' && dominant_land_use === 'agricultural') {
      land_use_conflict = true;
    } else if (property_type === 'apartment' && dominant_land_use === 'industrial') {
      land_use_conflict = true;
    }

    const notes = land_use_conflict
      ? `CONFLICT: Property type '${property_type}' may not align with '${dominant_land_use}' zoning. Verify with local authorities.`
      : `Property type '${property_type}' is compatible with '${dominant_land_use}' land use.`;

    // Insert or update land use profile
    const { data, error } = await supabase
      .from('land_use_profiles')
      .upsert({
        listing_id,
        dominant_land_use,
        allowed_uses,
        zoning_code,
        land_use_conflict,
        notes,
        calculated_at: new Date().toISOString(),
      }, {
        onConflict: 'listing_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting land use profile:', error);
      throw error;
    }

    console.log('Land use profile created/updated:', data);

    return new Response(
      JSON.stringify({ success: true, profile: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in calculate-land-use:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
