import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildSystemPrompt(s: Record<string, unknown>): string {
  const purchasePrice = Number(s.purchasePrice ?? 0);
  const downPaymentPercent = Number(s.downPaymentPercent ?? 20);
  const downPayment = purchasePrice * (downPaymentPercent / 100);
  const loanAmount = purchasePrice - downPayment;
  const rentPerUnit = Number(s.rentPerUnit ?? 0);
  const numberOfUnits = Number(s.numberOfUnits ?? 1);
  const totalRent = rentPerUnit * numberOfUnits;

  return `You are Deal Advisor, an expert real estate investment analyst for Deal Wise Rent. Help investors analyze rental property deals, optimize returns, and make confident decisions.

Current deal being analyzed:
- Purchase Price: $${purchasePrice.toLocaleString()}
- Down Payment: ${downPaymentPercent}% ($${downPayment.toLocaleString()})
- Loan Amount: $${loanAmount.toLocaleString()} @ ${s.interestRate}% for ${s.loanTerm} yrs
- Rent: ${numberOfUnits} unit(s) × $${rentPerUnit}/mo = $${totalRent.toLocaleString()}/mo
- Vacancy: ${s.vacancyRate}% | Annual rent increase: ${s.annualRentIncrease}%
- Property Taxes: $${s.propertyTaxes}/yr | Insurance: $${s.insurance}/yr
- Maintenance/CapEx: $${s.maintenanceCapex}/yr
- Management: ${s.isDIY ? "DIY (no fee)" : `${s.propertyManagementFee}% of EGI`}
- HOA: $${s.hoa}/mo | Appreciation: ${s.appreciationRate}%/yr

Guidelines:
- Be direct, actionable, and specific to this exact deal
- Use markdown (bold, bullets, headers) for clarity
- Benchmark against: 1% rule (monthly rent ≥ 1% of purchase price), 50% expense rule, cap rate 5-10%
- When recommending a specific numeric change, append it at the end in this exact block:
\`\`\`apply
{"field": "fieldName", "value": numericValue}
\`\`\`
Valid fields: purchasePrice, downPaymentPercent, interestRate, loanTerm, rentPerUnit, numberOfUnits, vacancyRate, annualRentIncrease, propertyTaxes, insurance, maintenanceCapex, propertyManagementFee, hoa, sewer, water, lawnCare, tenantPlacementFee, leaseRenewalFee, annualTuneupFee, annualExpenseIncrease, appreciationRate, isDIY`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, calculatorState } = await req.json();

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY secret is not configured in Supabase." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemMsg = {
      role: "system",
      content: buildSystemPrompt(calculatorState ?? {}),
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        stream: true,
        messages: [systemMsg, ...messages],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("OpenAI error:", response.status, text);
      return new Response(
        JSON.stringify({ error: `OpenAI error ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Stream OpenAI's SSE response straight back to the client
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
