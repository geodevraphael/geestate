import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import * as turf from 'https://esm.sh/@turf/turf@7.2.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValuationRequest {
  listing_id: string;
  property_type: string;
  region?: string;
  district?: string;
  geojson: any;
}

// Mock base prices per m² by region (TZS)
const BASE_PRICES: Record<string, number> = {
  'dar es salaam': 150000, // Urban premium
  'arusha': 80000,
  'kilimanjaro': 75000,
  'mwanza': 60000,
  'dodoma': 50000,
  'default': 40000,
};

// Property type multipliers
const PROPERTY_MULTIPLIERS: Record<string, number> = {
  'commercial': 1.5,
  'house': 1.2,
  'apartment': 1.3,
  'land': 0.8,
  'other': 1.0,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { listing_id, property_type, region, district, geojson }: ValuationRequest = await req.json();

    console.log('Calculating valuation for listing:', listing_id);

    if (!listing_id || !property_type || !geojson) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const polygon = turf.polygon(geojson.coordinates);
    const area_m2 = turf.area(polygon);

    // Get base price for region
    const regionKey = region?.toLowerCase() || 'default';
    let base_price_per_m2 = BASE_PRICES[regionKey] || BASE_PRICES['default'];

    // Apply property type multiplier
    const property_multiplier = PROPERTY_MULTIPLIERS[property_type] || 1.0;
    base_price_per_m2 *= property_multiplier;

    // Fetch additional data for adjustments
    const [spatial_risk, land_use] = await Promise.all([
      supabase.from('spatial_risk_profiles').select('*').eq('listing_id', listing_id).single(),
      supabase.from('land_use_profiles').select('*').eq('listing_id', listing_id).single(),
    ]);

    let confidence_score = 50; // base confidence

    // Adjust for flood risk
    if (spatial_risk.data) {
      confidence_score += 15;
      if (spatial_risk.data.flood_risk_level === 'high') {
        base_price_per_m2 *= 0.7; // 30% discount
      } else if (spatial_risk.data.flood_risk_level === 'medium') {
        base_price_per_m2 *= 0.85; // 15% discount
      }
    }

    // Adjust for land use
    if (land_use.data) {
      confidence_score += 15;
      if (land_use.data.land_use_conflict) {
        base_price_per_m2 *= 0.9; // 10% discount for conflicts
      }
      
      // Bonus for commercial zoning
      if (land_use.data.dominant_land_use === 'commercial' && property_type === 'commercial') {
        base_price_per_m2 *= 1.15; // 15% premium
      }
    }

    // Calculate final estimated value
    const estimated_value = Math.round(base_price_per_m2 * area_m2);

    // Confidence score adjustments
    if (area_m2 > 1000 && area_m2 < 100000) {
      // Typical parcel size, more confident
      confidence_score += 10;
    }
    if (region) {
      confidence_score += 10;
    }

    const notes = `Rule-based valuation: ${Math.round(area_m2)}m² @ ${Math.round(base_price_per_m2)} TZS/m². Factors: property type, region, flood risk, land use. This is an automated estimate for reference only.`;

    // Insert or update valuation estimate
    const { data, error } = await supabase
      .from('valuation_estimates')
      .upsert({
        listing_id,
        estimated_value,
        estimation_currency: 'TZS',
        estimation_method: 'rule_based_v1',
        confidence_score: Math.min(100, confidence_score),
        notes,
      }, {
        onConflict: 'listing_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting valuation estimate:', error);
      throw error;
    }

    console.log('Valuation estimate created/updated:', data);

    return new Response(
      JSON.stringify({ success: true, estimate: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in calculate-valuation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
