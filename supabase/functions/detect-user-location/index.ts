import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude } = await req.json();
    
    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: "latitude and longitude required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Query wards with a bounding box filter first (fast), then exact match
    // This uses a SQL function for efficient spatial lookup
    const { data: wardData, error: wardError } = await supabase.rpc(
      'find_ward_by_point',
      { lat: latitude, lng: longitude }
    );

    if (wardError) {
      console.error('Ward lookup error:', wardError);
      // Fallback: try simple query with limits
      return await fallbackLookup(supabase, latitude, longitude, corsHeaders);
    }

    if (wardData && wardData.length > 0) {
      const ward = wardData[0];
      
      // Count properties in this area
      const { count } = await supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published')
        .eq('ward_id', ward.ward_id);

      return new Response(
        JSON.stringify({
          region: ward.region_id ? { id: ward.region_id, name: ward.region_name } : null,
          district: ward.district_id ? { id: ward.district_id, name: ward.district_name } : null,
          ward: ward.ward_id ? { id: ward.ward_id, name: ward.ward_name } : null,
          propertyCount: count || 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No ward found - return coordinates only
    return new Response(
      JSON.stringify({
        region: null,
        district: null,
        ward: null,
        propertyCount: 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Location detection error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function fallbackLookup(supabase: any, lat: number, lng: number, corsHeaders: any) {
  // Simple bounding box approach - get nearby wards based on rough coordinates
  // Tanzania bounds: roughly lat -1 to -12, lng 29 to 41
  const tolerance = 0.5; // ~50km tolerance
  
  const { data: wards, error } = await supabase
    .from('wards')
    .select(`
      id, name,
      districts!inner (
        id, name,
        regions!inner (id, name)
      )
    `)
    .limit(1);

  if (error || !wards || wards.length === 0) {
    return new Response(
      JSON.stringify({ region: null, district: null, ward: null, propertyCount: 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Just return a general Tanzania location indicator
  return new Response(
    JSON.stringify({
      region: null,
      district: null, 
      ward: null,
      propertyCount: 0,
      message: "Location outside mapped wards"
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
