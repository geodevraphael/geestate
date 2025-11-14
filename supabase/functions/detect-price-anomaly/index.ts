import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PriceAnomalyRequest {
  listing_id: string;
  user_id: string;
  current_price: number;
  property_type: string;
  region?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { listing_id, user_id, current_price, property_type, region }: PriceAnomalyRequest = await req.json();

    console.log('Checking price anomaly for listing:', listing_id);

    if (!listing_id || !user_id || current_price === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fraudSignals = [];

    // Get listing history to check for price drops
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, price, created_at, updated_at')
      .eq('id', listing_id)
      .single();

    if (listingError) {
      console.error('Error fetching listing:', listingError);
    } else if (listing && listing.price && listing.price !== current_price) {
      const priceDrop = ((listing.price - current_price) / listing.price) * 100;
      
      if (priceDrop > 50) {
        console.log(`Suspicious price drop detected: ${priceDrop.toFixed(1)}%`);
        fraudSignals.push({
          listing_id,
          user_id,
          signal_type: 'rapid_price_drop',
          signal_score: 16,
          details: `Price dropped by ${priceDrop.toFixed(1)}% from ${listing.price} to ${current_price}`,
        });
      } else if (priceDrop > 30) {
        console.log(`Notable price drop detected: ${priceDrop.toFixed(1)}%`);
        fraudSignals.push({
          listing_id,
          user_id,
          signal_type: 'rapid_price_drop',
          signal_score: 10,
          details: `Price dropped by ${priceDrop.toFixed(1)}% from ${listing.price} to ${current_price}`,
        });
      }
    }

    // Compare with similar listings in the same region
    if (region) {
      let query = supabase
        .from('listings')
        .select('price')
        .eq('property_type', property_type)
        .eq('region', region)
        .not('price', 'is', null)
        .neq('id', listing_id)
        .eq('status', 'published')
        .limit(20);

      const { data: similarListings, error: similarError } = await query;

      if (similarError) {
        console.error('Error fetching similar listings:', similarError);
      } else if (similarListings && similarListings.length >= 3) {
        const prices = similarListings.map(l => l.price);
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        const deviation = ((avgPrice - current_price) / avgPrice) * 100;

        console.log(`Average price in region: ${avgPrice}, Current: ${current_price}, Deviation: ${deviation.toFixed(1)}%`);

        if (current_price < avgPrice * 0.4) {
          // Price is less than 40% of average - highly suspicious
          fraudSignals.push({
            listing_id,
            user_id,
            signal_type: 'rapid_price_drop',
            signal_score: 14,
            details: `Price ${current_price} is ${deviation.toFixed(1)}% below regional average of ${avgPrice.toFixed(0)}`,
          });
        } else if (current_price > avgPrice * 3) {
          // Price is more than 3x average - potentially fraudulent
          fraudSignals.push({
            listing_id,
            user_id,
            signal_type: 'rapid_price_drop',
            signal_score: 8,
            details: `Price ${current_price} is ${Math.abs(deviation).toFixed(1)}% above regional average of ${avgPrice.toFixed(0)}`,
          });
        }
      }
    }

    // Check for extremely low or high prices (absolute values)
    if (current_price < 1000000) {
      // Less than 1M TZS is suspiciously low for land/property
      fraudSignals.push({
        listing_id,
        user_id,
        signal_type: 'rapid_price_drop',
        signal_score: 12,
        details: `Suspiciously low price: ${current_price} TZS`,
      });
    } else if (current_price > 10000000000) {
      // More than 10B TZS is suspiciously high
      fraudSignals.push({
        listing_id,
        user_id,
        signal_type: 'rapid_price_drop',
        signal_score: 8,
        details: `Suspiciously high price: ${current_price} TZS`,
      });
    }

    // Insert fraud signals if any were detected
    if (fraudSignals.length > 0) {
      const { error: insertError } = await supabase
        .from('fraud_signals')
        .insert(fraudSignals);

      if (insertError) {
        console.error('Error inserting fraud signals:', insertError);
      } else {
        console.log(`Inserted ${fraudSignals.length} fraud signals`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        signals_detected: fraudSignals.length,
        signals: fraudSignals,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in detect-price-anomaly:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
