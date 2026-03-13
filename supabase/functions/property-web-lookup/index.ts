import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REALTOR_GRAPHQL = "https://www.realtor.com/frontdoor/graphql";

// Browser headers that mimic Realtor.com's own web client (HomeHarvest approach)
const REALTOR_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  "Origin": "https://www.realtor.com",
  "Referer": "https://www.realtor.com/",
  "rdc-client-name": "RDC_WEB_SRP_FS_PAGE",
  "rdc-client-version": "3.0.2515",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
  "x-is-bot": "false",
};

// Valid status enums from Realtor.com's GraphQL schema
// NOTE: "off_market" is NOT a valid enum — using it breaks the entire query
const PROPERTY_RESULT_FIELDS = `
  property_id
  href
  list_price
  last_sold_price
  last_sold_date
  status
  price_per_sqft
  list_date
  primary_photo(https: true) { href }
  current_estimates {
    estimate
    isbest_homevalue
    source { name }
  }
`;

const SEARCH_QUERY = `
  query HomeSearch($search_location: SearchLocation!) {
    home_search(
      query: {
        search_location: $search_location
        status: [for_sale, sold, pending]
      }
      limit: 1
      offset: 0
    ) {
      results { ${PROPERTY_RESULT_FIELDS} }
    }
  }
`;

// Direct property lookup by Realtor.com property_id
const HOME_QUERY = `
  query GetHome($property_id: ID!) {
    home(property_id: $property_id) { ${PROPERTY_RESULT_FIELDS} }
  }
`;

/**
 * Transform Realtor.com thumbnail URL to webp variant.
 * HomeHarvest technique: replace "s.jpg" suffix with optimized webp variant.
 */
function transformImageUrl(href: string | null | undefined): string | null {
  if (!href) return null;
  if (href.includes("s.jpg")) {
    return href.replace("s.jpg", "od-w480_h360.webp?w=480&q=75");
  }
  return href;
}

/**
 * Fetch an image server-side with Realtor.com Referer header and return as
 * a base64 data URL. This bypasses CDN hotlink protection that blocks browsers.
 */
async function fetchImageAsDataUrl(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, {
      headers: {
        "Referer": "https://www.realtor.com/",
        "User-Agent": REALTOR_HEADERS["User-Agent"],
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });
    if (!res.ok) {
      console.error("Image fetch failed:", res.status, imageUrl);
      return null;
    }
    const contentType = res.headers.get("content-type") ?? "image/webp";
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // Build base64 without spread to avoid stack overflow on large buffers
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return `data:${contentType};base64,${btoa(binary)}`;
  } catch (e) {
    console.error("Image fetch error:", e);
    return null;
  }
}

function mapStatus(status: string | null | undefined): string | null {
  if (!status) return null;
  const map: Record<string, string> = {
    for_sale: "Active",
    new_construction: "Active",
    pending: "Pending",
    sold: "Sold",
    for_rent: "Active",
  };
  return map[status.toLowerCase()] ?? status;
}

function calcDaysOnMarket(listDate: string | null | undefined): number | null {
  if (!listDate) return null;
  const diff = Math.floor((Date.now() - new Date(listDate).getTime()) / 86400000);
  return diff >= 0 ? diff : null;
}

function formatLastSoldDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    return new Date(raw).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  } catch {
    return raw;
  }
}

function buildResult(
  prop: Record<string, any>
): { data: Record<string, unknown>; rawImageUrl: string | null } {
  const estimates: any[] = prop.current_estimates ?? [];
  const bestEst = estimates.find((e: any) => e.isbest_homevalue) ?? estimates[0];

  let listingUrl: string | null = prop.href ?? null;
  if (listingUrl && !listingUrl.startsWith("http")) {
    listingUrl = `https://www.realtor.com${listingUrl}`;
  }

  const rawImageUrl = transformImageUrl(prop.primary_photo?.href);

  return {
    rawImageUrl,
    data: {
      listedPrice: prop.list_price ?? null,
      estimatedValue: bestEst?.estimate ?? null,
      listingStatus: mapStatus(prop.status),
      daysOnMarket: calcDaysOnMarket(prop.list_date),
      pricePerSqft: prop.price_per_sqft ? Math.round(prop.price_per_sqft) : null,
      listingUrl,
      source: "Realtor.com",
      lastSoldPrice: prop.last_sold_price ?? null,
      lastSoldDate: formatLastSoldDate(prop.last_sold_date),
      imageUrl: null, // filled in after server-side image fetch
    },
  };
}

/**
 * Try to extract Realtor.com property_id from a URL slug.
 * URL format: .../14816-Alberta-Ave_Warren_MI_48089_M46892-03426
 * The trailing _M<digits>-<digits> is the property ID.
 */
function extractRealtorPropertyId(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("realtor.com")) return null;
    const slug = u.pathname.split("/").filter(Boolean).pop() ?? "";
    const match = slug.match(/_(M\d+-\d+)$/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

async function graphqlRequest(
  query: string,
  variables: Record<string, unknown>
): Promise<any> {
  const res = await fetch(REALTOR_GRAPHQL, {
    method: "POST",
    headers: REALTOR_HEADERS,
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    console.error("Realtor.com GraphQL HTTP error:", res.status, await res.text());
    return null;
  }
  const json = await res.json();
  if (json.errors) {
    console.error("Realtor.com GraphQL errors:", JSON.stringify(json.errors));
    return null;
  }
  return json.data;
}

async function resolveWithImage(
  prop: Record<string, any>
): Promise<Record<string, unknown>> {
  const { data, rawImageUrl } = buildResult(prop);
  if (rawImageUrl) {
    const dataUrl = await fetchImageAsDataUrl(rawImageUrl);
    data.imageUrl = dataUrl; // base64 data URL, no hotlink issues
  }
  return data;
}

async function fetchFromRealtorByPropertyId(
  propertyId: string
): Promise<Record<string, unknown> | null> {
  try {
    const data = await graphqlRequest(HOME_QUERY, { property_id: propertyId });
    const prop = data?.home;
    if (!prop) return null;
    return await resolveWithImage(prop);
  } catch (e) {
    console.error("Realtor.com home() query error:", e);
    return null;
  }
}

async function fetchFromRealtorByAddress(
  address: string
): Promise<Record<string, unknown> | null> {
  try {
    const data = await graphqlRequest(SEARCH_QUERY, {
      search_location: { location: address },
    });
    const results = data?.home_search?.results;
    if (!Array.isArray(results) || results.length === 0) return null;
    return await resolveWithImage(results[0]);
  } catch (e) {
    console.error("Realtor.com search error:", e);
    return null;
  }
}

async function fetchFromOpenAI(
  address: string,
  apiKey: string,
  listingUrl?: string
): Promise<Record<string, unknown>> {
  const urlHint = listingUrl
    ? `\n\nThe user provided this listing URL — look it up directly: ${listingUrl}`
    : "";

  const prompt = `Search for the current real estate listing of this property: "${address}"${urlHint}

Find and return:
1. Current asking/listing price (list_price)
2. Estimated market value (Zestimate or AVM)
3. Listing status: Active, Pending, Sold, Off Market
4. Days on market
5. Price per square foot
6. Direct URL to the listing page (Zillow, Redfin, or Realtor.com)
7. Main exterior/front photo — a DIRECT image file URL ending in .jpg, .jpeg, .png, or .webp (NOT a page URL)

Return ONLY a valid JSON object, no markdown:
{
  "listedPrice": <integer or null>,
  "estimatedValue": <integer or null>,
  "listingStatus": <"Active"|"Pending"|"Sold"|"Off Market"|null>,
  "daysOnMarket": <integer or null>,
  "pricePerSqft": <integer or null>,
  "listingUrl": <string or null>,
  "source": <"Zillow"|"Redfin"|"Realtor.com"|null>,
  "lastSoldPrice": <integer or null>,
  "lastSoldDate": <string or null: e.g. "March 2023">,
  "imageUrl": <string or null: direct image file URL only>
}`;

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        tools: [{ type: "web_search_preview" }],
        input: prompt,
      }),
    });

    let raw = "";
    if (res.ok) {
      const d = await res.json();
      for (const item of d.output ?? []) {
        if (item.type === "message") {
          for (const c of item.content ?? []) {
            if (c.type === "output_text") raw = c.text;
          }
        }
      }
    } else {
      // Chat completions fallback (no web search)
      const fb = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          max_tokens: 500,
        }),
      });
      if (fb.ok) {
        const fd = await fb.json();
        raw = fd.choices?.[0]?.message?.content?.trim() ?? "{}";
      }
    }

    const jsonStr = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/, "").trim();
    try {
      return JSON.parse(jsonStr);
    } catch {
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (match) {
        try { return JSON.parse(match[0]); } catch { /* ignore */ }
      }
    }
  } catch (e) {
    console.error("OpenAI fallback error:", e);
  }
  return {};
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address, url } = await req.json();

    // Strategy 1: Direct Realtor.com property ID lookup (most accurate)
    // Extract property_id from Realtor.com URL if provided
    const realtorPropertyId = url ? extractRealtorPropertyId(url) : null;
    if (realtorPropertyId) {
      console.log("Trying Realtor.com home() query with property_id:", realtorPropertyId);
      const result = await fetchFromRealtorByPropertyId(realtorPropertyId);
      if (result) {
        return new Response(JSON.stringify({ webData: result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Strategy 2: Realtor.com GraphQL address search
    console.log("Trying Realtor.com address search for:", address);
    const addressResult = await fetchFromRealtorByAddress(address);
    if (addressResult) {
      return new Response(JSON.stringify({ webData: addressResult }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strategy 3: OpenAI web search (with original URL hint if available)
    console.log("Falling back to OpenAI web search");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const webData = OPENAI_API_KEY
      ? await fetchFromOpenAI(address, OPENAI_API_KEY, url)
      : {};

    return new Response(JSON.stringify({ webData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("property-web-lookup error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
