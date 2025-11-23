import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Updating published listings with valuation estimates...');

    // Get all published listings without price that have valuation estimates
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select(`
        id,
        title,
        price,
        currency
      `)
      .eq('status', 'published')
      .or('price.is.null,price.eq.0');

    if (listingsError) throw listingsError;

    console.log(`Found ${listings?.length || 0} listings without price`);

    let updatedCount = 0;
    let errors = [];

    for (const listing of listings || []) {
      try {
        // Get the latest valuation estimate for this listing
        const { data: valuation, error: valuationError } = await supabase
          .from('valuation_estimates')
          .select('estimated_value, estimation_currency')
          .eq('listing_id', listing.id)
          .gt('estimated_value', 0)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (valuationError) {
          console.error(`Error fetching valuation for listing ${listing.id}:`, valuationError);
          continue;
        }

        if (!valuation || !valuation.estimated_value) {
          console.log(`No valuation found for listing ${listing.id}`);
          continue;
        }

        // Update the listing with the valuation estimate
        const { error: updateError } = await supabase
          .from('listings')
          .update({
            price: valuation.estimated_value,
            currency: valuation.estimation_currency || listing.currency || 'TZS'
          })
          .eq('id', listing.id);

        if (updateError) {
          console.error(`Error updating listing ${listing.id}:`, updateError);
          errors.push({ listing_id: listing.id, error: updateError.message });
        } else {
          console.log(`Updated listing ${listing.id} with price ${valuation.estimated_value}`);
          updatedCount++;
        }
      } catch (error: any) {
        console.error(`Error processing listing ${listing.id}:`, error);
        errors.push({ listing_id: listing.id, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated: updatedCount,
        total_checked: listings?.length || 0,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in update-listings-with-valuation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
