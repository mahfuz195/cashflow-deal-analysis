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
    const { address, propertyData } = await req.json();

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY is not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const knownInfo = [
      propertyData?.bedrooms != null && `Bedrooms: ${propertyData.bedrooms}`,
      propertyData?.bathrooms != null && `Bathrooms: ${propertyData.bathrooms}`,
      propertyData?.squareFootage && `Square footage: ${propertyData.squareFootage} sqft`,
      propertyData?.yearBuilt && `Year built: ${propertyData.yearBuilt}`,
      propertyData?.propertyType && `Property type: ${propertyData.propertyType}`,
      propertyData?.lastSalePrice && `Last known sale price: $${propertyData.lastSalePrice.toLocaleString()}`,
      propertyData?.assessedValue && `Assessed value: $${propertyData.assessedValue.toLocaleString()}`,
      propertyData?.medianRent && `Nearby median rent (2 miles): $${propertyData.medianRent}/month`,
      propertyData?.propertyTaxes && `Property taxes: $${propertyData.propertyTaxes}/year`,
    ].filter(Boolean).join("\n");

    const prompt = `You are an expert real estate investment analyst. Research the property at: ${address}

Known property data:
${knownInfo || "No prior data available."}

Use web search to find:
1. Current comparable sales (comps) in the area to estimate fair market value
2. Current rental rates for similar properties (same beds/baths, similar size)
3. Local market vacancy rates and rent trend (year-over-year growth %)
4. Property tax rates for this jurisdiction (if not provided above)
5. Typical landlord insurance and maintenance/CapEx costs for this market

Return ONLY a valid JSON object with NO markdown, NO code blocks, NO explanation. Exact structure:
{
  "estimatedValue": <integer: current fair market value based on comps>,
  "rentLow": <integer: conservative monthly rent estimate (10th percentile)>,
  "rentMedian": <integer: median monthly rent for comparable units>,
  "rentHigh": <integer: optimistic monthly rent (90th percentile)>,
  "propertyTaxes": <integer: annual property taxes in USD>,
  "insurance": <integer: annual landlord insurance in USD>,
  "maintenanceCapex": <integer: annual maintenance + CapEx reserve in USD>,
  "marketCondition": <"Hot" | "Balanced" | "Cool">,
  "avgAreaCapRate": <number: typical cap rate % for rentals in this market>,
  "rentTrend": <number: estimated annual rent growth % in this area>,
  "notes": <string: 2-3 sentence market summary mentioning key data sources and comparable properties found>
}`;

    // Use OpenAI Responses API with web_search_preview for live data
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

    if (!response.ok) {
      const text = await response.text();
      console.error("OpenAI Responses API error:", response.status, text);

      // Fallback: try chat completions without web search
      const fallback = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 600,
        }),
      });

      if (!fallback.ok) {
        throw new Error(`OpenAI error ${response.status}`);
      }

      const fallbackData = await fallback.json();
      const raw = fallbackData.choices?.[0]?.message?.content?.trim() ?? "{}";
      const jsonStr = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/, "").trim();
      let marketResearch: Record<string, unknown> = {};
      try { marketResearch = JSON.parse(jsonStr); } catch {
        const match = jsonStr.match(/\{[\s\S]*\}/);
        if (match) { try { marketResearch = JSON.parse(match[0]); } catch { /* ignore */ } }
      }
      return new Response(
        JSON.stringify({ marketResearch, webSearchUsed: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    // Extract text from the Responses API output array
    let raw = "";
    for (const item of data.output ?? []) {
      if (item.type === "message") {
        for (const c of item.content ?? []) {
          if (c.type === "output_text") {
            raw = c.text;
          }
        }
      }
    }

    // Strip any accidental markdown wrappers
    const jsonStr = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/, "").trim();

    let marketResearch: Record<string, unknown> = {};
    try {
      marketResearch = JSON.parse(jsonStr);
    } catch {
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (match) {
        try { marketResearch = JSON.parse(match[0]); } catch { /* ignore */ }
      }
      if (!marketResearch || Object.keys(marketResearch).length === 0) {
        console.error("Failed to parse market research JSON:", jsonStr);
      }
    }

    return new Response(
      JSON.stringify({ marketResearch, webSearchUsed: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-deal-analysis error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
