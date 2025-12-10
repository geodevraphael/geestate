import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate cron secret for security
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    
    if (!expectedSecret || cronSecret !== expectedSecret) {
      console.error("Unauthorized: Invalid or missing cron secret");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting listing expiry check...');

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    // Step 1: Find listings older than 1 year without deletion warning
    const { data: oldListings, error: oldListingsError } = await supabase
      .from('listings')
      .select('id, title, owner_id, created_at')
      .eq('status', 'published')
      .is('deletion_warning_sent_at', null)
      .lt('created_at', oneYearAgo.toISOString());

    if (oldListingsError) {
      throw new Error(`Error fetching old listings: ${oldListingsError.message}`);
    }

    console.log(`Found ${oldListings?.length || 0} listings older than 1 year`);

    // Send warnings and mark listings as pending deletion
    for (const listing of oldListings || []) {
      // Update listing with warning timestamp
      const { error: updateError } = await supabase
        .from('listings')
        .update({
          deletion_warning_sent_at: new Date().toISOString(),
          pending_deletion: true,
        })
        .eq('id', listing.id);

      if (updateError) {
        console.error(`Failed to update listing ${listing.id}:`, updateError);
        continue;
      }

      // Create notification for user
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: listing.owner_id,
          type: 'listing_verified',
          title: 'Property Scheduled for Deletion',
          message: `Your listing "${listing.title}" has been in the system for over 1 year. It will be permanently deleted unless you republish it. You can republish from your dashboard.`,
          link_url: `/dashboard`,
        });

      if (notifError) {
        console.error(`Failed to create notification for listing ${listing.id}:`, notifError);
      }

      console.log(`Sent deletion warning for listing: ${listing.id}`);
    }

    // Step 2: Delete listings with republish requested > 5 days ago with no response
    const { data: staleRepublishListings, error: staleError } = await supabase
      .from('listings')
      .select('id, title, owner_id')
      .not('republish_requested_at', 'is', null)
      .lt('republish_requested_at', fiveDaysAgo.toISOString())
      .eq('pending_deletion', true);

    if (staleError) {
      throw new Error(`Error fetching stale republish listings: ${staleError.message}`);
    }

    console.log(`Found ${staleRepublishListings?.length || 0} listings to delete (no response after republish)`);

    // Permanently delete listings
    for (const listing of staleRepublishListings || []) {
      // Delete related records first (media, polygons, etc.)
      await supabase.from('listing_media').delete().eq('listing_id', listing.id);
      await supabase.from('listing_polygons').delete().eq('listing_id', listing.id);
      await supabase.from('spatial_risk_profiles').delete().eq('listing_id', listing.id);
      await supabase.from('land_use_profiles').delete().eq('listing_id', listing.id);
      await supabase.from('proximity_analysis').delete().eq('listing_id', listing.id);
      await supabase.from('valuation_estimates').delete().eq('listing_id', listing.id);

      // Delete the listing
      const { error: deleteError } = await supabase
        .from('listings')
        .delete()
        .eq('id', listing.id);

      if (deleteError) {
        console.error(`Failed to delete listing ${listing.id}:`, deleteError);
        continue;
      }

      // Notify user of deletion
      await supabase
        .from('notifications')
        .insert({
          user_id: listing.owner_id,
          type: 'listing_verified',
          title: 'Property Deleted',
          message: `Your listing "${listing.title}" has been permanently deleted due to no response within 5 days of republish request.`,
          link_url: `/dashboard`,
        });

      console.log(`Deleted listing: ${listing.id}`);
    }

    // Step 3: Delete old warned listings (1 year + warning period)
    const warningPeriodExpired = new Date();
    warningPeriodExpired.setDate(warningPeriodExpired.getDate() - 30); // 30 days after warning

    const { data: expiredWarningListings, error: expiredError } = await supabase
      .from('listings')
      .select('id, title, owner_id')
      .eq('pending_deletion', true)
      .is('republish_requested_at', null)
      .not('deletion_warning_sent_at', 'is', null)
      .lt('deletion_warning_sent_at', warningPeriodExpired.toISOString());

    if (expiredError) {
      throw new Error(`Error fetching expired warning listings: ${expiredError.message}`);
    }

    console.log(`Found ${expiredWarningListings?.length || 0} listings to delete (warning period expired)`);

    // Delete these listings too
    for (const listing of expiredWarningListings || []) {
      await supabase.from('listing_media').delete().eq('listing_id', listing.id);
      await supabase.from('listing_polygons').delete().eq('listing_id', listing.id);
      await supabase.from('spatial_risk_profiles').delete().eq('listing_id', listing.id);
      await supabase.from('land_use_profiles').delete().eq('listing_id', listing.id);
      await supabase.from('proximity_analysis').delete().eq('listing_id', listing.id);
      await supabase.from('valuation_estimates').delete().eq('listing_id', listing.id);

      const { error: deleteError } = await supabase
        .from('listings')
        .delete()
        .eq('id', listing.id);

      if (deleteError) {
        console.error(`Failed to delete listing ${listing.id}:`, deleteError);
        continue;
      }

      await supabase
        .from('notifications')
        .insert({
          user_id: listing.owner_id,
          type: 'listing_verified',
          title: 'Property Deleted',
          message: `Your listing "${listing.title}" has been permanently deleted after 30 days of inactivity following the deletion warning.`,
          link_url: `/dashboard`,
        });

      console.log(`Deleted listing after warning period: ${listing.id}`);
    }

    const summary = {
      warningsSent: oldListings?.length || 0,
      staleRepublishDeleted: staleRepublishListings?.length || 0,
      expiredWarningsDeleted: expiredWarningListings?.length || 0,
    };

    console.log('Listing expiry check complete:', summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in check-listing-expiry:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
