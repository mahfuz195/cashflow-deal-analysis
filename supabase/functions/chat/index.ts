import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Deal Wise Rent Deal Coach — an expert real estate investment advisor embedded in the Deal Wise Rent rental property analyzer.

You receive the user's current calculator state as JSON. Your job:

1. **Automatic Deal Assessment** — When first invoked or asked "analyze my deal", provide:
   - Overall investment quality rating with justification
   - Identify the weakest metric (high expense ratio, low rent, high purchase price, etc.)
   - Compare to benchmarks: 1% rule (monthly rent ≥ 1% of purchase price), 50% expense rule, market cap rate norms (5-10%)

2. **Improvement Recommendations** — Suggest specific parameter changes:
   - "If you negotiate the purchase price down by $X, your CoC ROI improves from Y% to Z%."
   - "Increasing rent by $X/month pushes cash flow positive."
   - "Switching to DIY management saves $X/month."
   - Always quantify the impact.

3. **Deal Packaging** — When asked, present 2-3 offer scenarios:
   - Aggressive: lower price, conventional financing
   - Balanced: list price, higher down payment
   - Creative: seller financing, rate buydown
   Each with projected CoC ROI, monthly cash flow, cash invested.

4. **Free-form Q&A** — Answer questions about real estate investing, cap rates, markets, appreciation, property management, etc.

Format responses with markdown. Use **bold** for key numbers. Use bullet points for lists. Keep responses concise but actionable. When showing numbers, format currency with $ and commas, percentages with one decimal.

IMPORTANT: When suggesting a specific change the user can apply, format it as an "apply suggestion" by including a JSON block like this at the end of the suggestion:
\`\`\`apply
{"field": "purchasePrice", "value": 185000}
\`\`\`
Only include this when you're suggesting a specific single-field change. Valid fields: purchasePrice, improvements, closingCosts, downPaymentPercent, interestRate, loanTerm, rentPerUnit, numberOfUnits, vacancyRate, annualRentIncrease, propertyTaxes, insurance, maintenanceCapex, propertyManagementFee, hoa, sewer, water, lawnCare, tenantPlacementFee, leaseRenewalFee, annualTuneupFee, annualExpenseIncrease, appreciationRate, isDIY.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, calculatorState } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build system message with current state
    const stateContext = calculatorState
      ? `\n\nCurrent Calculator State:\n${JSON.stringify(calculatorState, null, 2)}`
      : "";

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT + stateContext },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service unavailable. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
