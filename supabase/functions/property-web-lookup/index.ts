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
    const { address } = await req.json();

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY is not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `Search for the current real estate listing of this property: "${address}"

Search Zillow, Redfin, and Realtor.com to find:
1. Current asking/listing price (if actively listed for sale)
2. Zestimate or estimated market value from Zillow
3. Redfin Estimate or Realtor.com estimated value
4. Listing status: Active, Pending, Sold, Off Market
5. Days on market (if listed)
6. Price per square foot (if available)
7. The URL of the listing page found (Zillow, Redfin, or Realtor.com)

Return ONLY a valid JSON object, no markdown, no explanation:
{
  "listedPrice": <integer or null: current asking price if actively listed>,
  "estimatedValue": <integer or null: Zestimate or best automated valuation>,
  "listingStatus": <"Active" | "Pending" | "Sold" | "Off Market" | null>,
  "daysOnMarket": <integer or null>,
  "pricePerSqft": <integer or null>,
  "listingUrl": <string or null: URL of the listing found>,
  "source": <"Zillow" | "Redfin" | "Realtor.com" | null: which site had the best data>,
  "lastSoldPrice": <integer or null: most recent sale price if available>,
  "lastSoldDate": <string or null: date of last sale e.g. "March 2023">
}`;

    // Try OpenAI Responses API with web_search_preview
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        tools: [{ type: "web_search_preview" }],
        input: prompt,
      }),
    });

    let raw = "";

    if (response.ok) {
      const data = await response.json();
      for (const item of data.output ?? []) {
        if (item.type === "message") {
          for (const c of item.content ?? []) {
            if (c.type === "output_text") raw = c.text;
          }
        }
      }
    } else {
      // Fallback to chat completions without web search
      const fallback = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          max_tokens: 400,
        }),
      });
      if (fallback.ok) {
        const fd = await fallback.json();
        raw = fd.choices?.[0]?.message?.content?.trim() ?? "{}";
      }
    }

    // Strip markdown code blocks
    const jsonStr = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/, "").trim();

    let webData: Record<string, unknown> = {};
    try {
      webData = JSON.parse(jsonStr);
    } catch {
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (match) {
        try { webData = JSON.parse(match[0]); } catch { /* ignore */ }
      }
    }

    return new Response(
      JSON.stringify({ webData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("property-web-lookup error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
