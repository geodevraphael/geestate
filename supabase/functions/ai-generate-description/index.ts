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
    const { listingData, locale } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const { property_type, location_label, region, district, ward, area_m2, land_use, flood_risk, price } = listingData;

    const promptEN = `Write a professional and attractive property listing description for:
- Property Type: ${property_type}
- Location: ${location_label}, ${ward || ''} ${district || ''}, ${region || ''}
- Area: ${area_m2 ? `${area_m2} square meters` : 'Not specified'}
- Land Use: ${land_use || 'Not specified'}
- Flood Risk: ${flood_risk || 'Not assessed'}
- Price: ${price ? `TZS ${price.toLocaleString()}` : 'Contact for price'}

Create a compelling 2-3 paragraph description highlighting the property's features, location advantages, and investment potential. Keep it professional and factual.`;

    const promptSW = `Andika maelezo ya tangazo la mali yenye uzalishaji na ya kitaaluma kwa:
- Aina ya Mali: ${property_type}
- Mahali: ${location_label}, ${ward || ''} ${district || ''}, ${region || ''}
- Eneo: ${area_m2 ? `Mita za mraba ${area_m2}` : 'Haijatajwa'}
- Matumizi ya Ardhi: ${land_use || 'Hayajatajwa'}
- Hatari ya Mafuriko: ${flood_risk || 'Haijatatuliwa'}
- Bei: ${price ? `TZS ${price.toLocaleString()}` : 'Wasiliana kwa bei'}

Unda maelezo ya aya 2-3 yenye kuvutia yanayoonyesha vipengele vya mali, faida za eneo, na uwezekano wa uwekezaji. Weka kitaaluma na kwa ukweli.`;

    const prompt = locale === 'sw' ? promptSW : promptEN;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: locale === 'sw' 
              ? "Wewe ni mshauri wa mali wa kitaaluma anayesaidia kuandika maelezo ya matangazo ya mali nchini Tanzania."
              : "You are a professional real estate advisor helping to write property listing descriptions in Tanzania.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const description = aiData.choices?.[0]?.message?.content;

    return new Response(
      JSON.stringify({ description }),
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
