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
    const { propertyData, missingFields } = await req.json();

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY is not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const knownInfo = [
      propertyData.address && `Address: ${propertyData.address}`,
      propertyData.bedrooms != null && `Bedrooms: ${propertyData.bedrooms}`,
      propertyData.bathrooms != null && `Bathrooms: ${propertyData.bathrooms}`,
      propertyData.squareFootage && `Square footage: ${propertyData.squareFootage} sqft`,
      propertyData.yearBuilt && `Year built: ${propertyData.yearBuilt}`,
      propertyData.propertyType && `Property type: ${propertyData.propertyType}`,
      propertyData.lastSalePrice && `Last sale price: $${propertyData.lastSalePrice.toLocaleString()}`,
      propertyData.assessedValue && `Assessed value: $${propertyData.assessedValue.toLocaleString()}`,
      propertyData.medianRent && `Nearby median rent: $${propertyData.medianRent}/month`,
    ].filter(Boolean).join("\n");

    const fieldDescriptions: Record<string, string> = {
      purchasePrice: "Estimated current market value / listing price in USD (integer)",
      rentPerUnit: "Estimated monthly rental income per unit in USD (integer)",
      propertyTaxes: "Estimated annual property taxes in USD (integer)",
      insurance: "Estimated annual landlord insurance in USD (integer)",
      maintenanceCapex: "Estimated annual maintenance + CapEx reserve in USD (integer)",
    };

    const fieldsToEstimate = missingFields
      .filter((f: string) => fieldDescriptions[f])
      .map((f: string) => `- ${f}: ${fieldDescriptions[f]}`)
      .join("\n");

    if (!fieldsToEstimate) {
      return new Response(
        JSON.stringify({ estimates: {} }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `You are a real estate data expert. Based on the following known property details, estimate the missing values. Return ONLY a valid JSON object with the field names as keys and numeric values (no strings, no units).

Known property details:
${knownInfo}

Estimate these missing fields:
${fieldsToEstimate}

Rules:
- Be realistic based on the property location and characteristics
- Use current US market conditions
- Return only the JSON object, no explanation, no markdown, no code blocks

Example format: {"purchasePrice": 285000, "propertyTaxes": 3200}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("OpenAI error:", response.status, text);
      return new Response(
        JSON.stringify({ error: `OpenAI error ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "{}";

    // Strip markdown code blocks if present
    const jsonStr = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/, "").trim();

    let estimates: Record<string, number> = {};
    try {
      estimates = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse OpenAI JSON:", jsonStr);
    }

    return new Response(
      JSON.stringify({ estimates }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("property-estimate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
