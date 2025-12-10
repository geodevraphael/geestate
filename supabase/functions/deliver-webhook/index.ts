import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
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

    const { event_type, payload } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active subscriptions for this event type
    const { data: subscriptions, error: subError } = await supabase
      .from("webhook_subscriptions")
      .select("*")
      .eq("event_type", event_type)
      .eq("is_active", true);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active subscriptions for this event" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deliver to each subscription
    const deliveryPromises = subscriptions.map(async (sub) => {
      try {
        const webhookResponse = await fetch(sub.target_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Secret": sub.secret_token,
            "X-Event-Type": event_type,
          },
          body: JSON.stringify({
            event_type,
            timestamp: new Date().toISOString(),
            payload,
          }),
        });

        const responseBody = await webhookResponse.text();
        const deliveryStatus = webhookResponse.ok ? "success" : "failed";

        // Log delivery
        await supabase.from("webhook_deliveries").insert({
          subscription_id: sub.id,
          event_type,
          payload,
          response_status: webhookResponse.status,
          response_body: responseBody.substring(0, 1000), // Truncate
          error_message: webhookResponse.ok ? null : `HTTP ${webhookResponse.status}`,
        });

        // Update subscription last delivery
        await supabase
          .from("webhook_subscriptions")
          .update({
            last_delivery_at: new Date().toISOString(),
            last_delivery_status: deliveryStatus,
          })
          .eq("id", sub.id);

        return { subscription_id: sub.id, status: deliveryStatus };
      } catch (error) {
        console.error(`Webhook delivery failed for ${sub.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        // Log failed delivery
        await supabase.from("webhook_deliveries").insert({
          subscription_id: sub.id,
          event_type,
          payload,
          response_status: null,
          error_message: errorMessage,
        });

        await supabase
          .from("webhook_subscriptions")
          .update({
            last_delivery_at: new Date().toISOString(),
            last_delivery_status: "failed",
          })
          .eq("id", sub.id);

        return { subscription_id: sub.id, status: "error", error: errorMessage };
      }
    });

    const results = await Promise.all(deliveryPromises);

    return new Response(
      JSON.stringify({ message: "Webhooks delivered", results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
