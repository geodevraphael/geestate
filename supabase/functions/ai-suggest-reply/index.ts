import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, listingTitle, locale } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const conversationContext = messages.map((m: any) => 
      `${m.sender_name}: ${m.content}`
    ).join('\n');

    const promptEN = `You are helping a seller respond to a buyer inquiry about their property listing: "${listingTitle}".

Recent conversation:
${conversationContext}

Generate a professional, friendly, and helpful reply. Keep it concise (2-3 sentences). Be responsive to the buyer's questions or concerns.`;

    const promptSW = `Unasaidia muuzaji kujibu hoja ya mnunuzi kuhusu tangazo lake la mali: "${listingTitle}".

Mazungumzo ya hivi karibuni:
${conversationContext}

Tengeneza jibu la kitaaluma, lenye urafiki, na la kusaidia. Weka lifupi (sentensi 2-3). Jibu maswali au wasiwasi wa mnunuzi.`;

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
              ? "Wewe ni msaidizi wa mazungumzo ya biashara wa mali."
              : "You are a professional real estate communication assistant.",
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
    const reply = aiData.choices?.[0]?.message?.content;

    return new Response(
      JSON.stringify({ reply }),
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
