import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "All fields are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Email service not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Deal Wise Rent Contact <onboarding@resend.dev>",
        to: ["dealwiserent@gmail.com"],
        reply_to: email,
        subject: `[Contact] ${subject}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#3730a3">New Contact Message — Deal Wise Rent</h2>
            <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
              <tr>
                <td style="padding:8px;font-weight:bold;color:#555;width:80px">From</td>
                <td style="padding:8px">${name} &lt;${email}&gt;</td>
              </tr>
              <tr style="background:#f9f9f9">
                <td style="padding:8px;font-weight:bold;color:#555">Subject</td>
                <td style="padding:8px">${subject}</td>
              </tr>
            </table>
            <div style="background:#f4f4f8;border-radius:8px;padding:16px;white-space:pre-wrap;color:#333">
              ${message.replace(/\n/g, "<br>")}
            </div>
            <p style="color:#999;font-size:12px;margin-top:16px">
              Sent via the Deal Wise Rent contact form. Reply directly to this email to respond to ${name}.
            </p>
          </div>
        `,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message ?? "Failed to send email.");
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message ?? "Unexpected error." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
