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

    console.log(`[detect-user-location] Looking up: ${latitude}, ${longitude}`);
    const startTime = Date.now();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use the database function for fast spatial lookup
    const { data: wardData, error: wardError } = await supabase.rpc(
      'find_ward_by_point',
      { lat: latitude, lng: longitude }
    );

    console.log(`[detect-user-location] RPC took ${Date.now() - startTime}ms`);

    if (wardError) {
      console.error('Ward lookup error:', wardError);
      return new Response(
        JSON.stringify({
          region: null,
          district: null,
          ward: null,
          propertyCount: 0,
          error: wardError.message
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (wardData && wardData.length > 0) {
      const ward = wardData[0];
      
      // Count properties in this area
      const { count } = await supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published')
        .eq('ward_id', ward.ward_id);

      console.log(`[detect-user-location] Found: ${ward.ward_name}, ${ward.district_name}, ${ward.region_name}`);
      console.log(`[detect-user-location] Total time: ${Date.now() - startTime}ms`);

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

    console.log(`[detect-user-location] No ward found, total time: ${Date.now() - startTime}ms`);

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

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[detect-user-location] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
