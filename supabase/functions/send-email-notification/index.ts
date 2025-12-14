import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailNotificationRequest {
  user_id?: string;
  email?: string;
  subject: string;
  html_content: string;
  text_content?: string;
}

async function sendEmail(to: string, subject: string, htmlContent: string, textContent?: string) {
  const smtpHost = Deno.env.get("SMTP_HOST");
  const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
  const smtpUser = Deno.env.get("SMTP_USER");
  const smtpPass = Deno.env.get("SMTP_PASS");
  const smtpFrom = Deno.env.get("SMTP_FROM");

  if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
    throw new Error("SMTP configuration is incomplete");
  }

  console.log(`Sending email to ${to} with subject: ${subject}`);

  const client = new SMTPClient({
    connection: {
      hostname: smtpHost,
      port: smtpPort,
      tls: smtpPort === 465,
      auth: {
        username: smtpUser,
        password: smtpPass,
      },
    },
  });

  try {
    await client.send({
      from: smtpFrom,
      to: to,
      subject: subject,
      content: textContent || "Please view this email in an HTML-compatible email client.",
      html: htmlContent,
    });
    console.log(`Email sent successfully to ${to}`);
  } finally {
    await client.close();
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, email, subject, html_content, text_content }: EmailNotificationRequest = await req.json();

    if (!subject || !html_content) {
      return new Response(
        JSON.stringify({ error: "subject and html_content are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let recipientEmail = email;

    // If user_id provided, look up email from profiles
    if (user_id && !email) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", user_id)
        .single();

      if (error || !profile?.email) {
        console.error("Error fetching user email:", error);
        return new Response(
          JSON.stringify({ error: "User email not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      recipientEmail = profile.email;
    }

    if (!recipientEmail) {
      return new Response(
        JSON.stringify({ error: "Either user_id or email must be provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await sendEmail(recipientEmail, subject, html_content, text_content);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
