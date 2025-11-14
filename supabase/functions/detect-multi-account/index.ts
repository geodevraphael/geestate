import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MultiAccountRequest {
  user_id: string;
  phone?: string;
  listing_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { user_id, phone, listing_id }: MultiAccountRequest = await req.json();

    console.log('Checking multi-account patterns for user:', user_id);

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fraudSignals = [];

    // Check for duplicate phone numbers
    if (phone) {
      const { data: duplicatePhones, error: phoneError } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .eq('phone', phone)
        .neq('id', user_id);

      if (phoneError) {
        console.error('Error checking duplicate phones:', phoneError);
      } else if (duplicatePhones && duplicatePhones.length > 0) {
        console.log(`Found ${duplicatePhones.length} accounts with same phone number`);
        fraudSignals.push({
          listing_id: listing_id || null,
          user_id,
          signal_type: 'multiple_accounts_same_phone',
          signal_score: 15,
          details: `Phone number ${phone} used by ${duplicatePhones.length + 1} different accounts`,
        });
      }
    }

    // Check for suspicious listing patterns
    const { data: userListings, error: listingsError } = await supabase
      .from('listings')
      .select('id, created_at, price, status')
      .eq('owner_id', user_id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (listingsError) {
      console.error('Error fetching user listings:', listingsError);
    } else if (userListings && userListings.length > 0) {
      // Check for rapid listing creation (more than 5 in last 24 hours)
      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);
      
      const recentListings = userListings.filter(
        (listing) => new Date(listing.created_at) > last24Hours
      );

      if (recentListings.length > 5) {
        console.log(`User created ${recentListings.length} listings in last 24 hours`);
        fraudSignals.push({
          listing_id: listing_id || null,
          user_id,
          signal_type: 'multiple_accounts_same_phone',
          signal_score: 10,
          details: `Suspicious activity: ${recentListings.length} listings created in 24 hours`,
        });
      }
    }

    // Check for accounts with multiple fraud flags
    const { data: existingFlags, error: flagsError } = await supabase
      .from('fraud_signals')
      .select('id')
      .eq('user_id', user_id);

    if (flagsError) {
      console.error('Error checking existing fraud flags:', flagsError);
    } else if (existingFlags && existingFlags.length >= 3) {
      console.log(`User has ${existingFlags.length} existing fraud signals`);
      fraudSignals.push({
        listing_id: listing_id || null,
        user_id,
        signal_type: 'multiple_accounts_same_phone',
        signal_score: 12,
        details: `User has accumulated ${existingFlags.length} fraud signals`,
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
    console.error('Error in detect-multi-account:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
