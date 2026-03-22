import { useState, useCallback, useRef } from 'react';
import { Link, MapPin, Download, Home, BedDouble, Bath, DollarSign, ChevronDown, ChevronUp, Loader2, CheckCircle2, Sparkles, Zap, AlertTriangle, Globe, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalculatorState } from '@/types/calculator';
import { toast } from 'sonner';

const ESTIMATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/property-estimate`;
const WEB_LOOKUP_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/property-web-lookup`;

async function fetchAiEstimates(
  propertyData: PropertyData,
  missingFields: string[]
): Promise<Record<string, number>> {
  if (!missingFields.length) return {};
  try {
    const res = await fetch(ESTIMATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ propertyData, missingFields }),
    });
    if (!res.ok) return {};
    const { estimates } = await res.json();
    return estimates ?? {};
  } catch {
    return {};
  }
}

interface PropertyImportProps {
  updateField: <K extends keyof CalculatorState>(field: K, value: CalculatorState[K]) => void;
  onOpenAiAnalysis: (address: string, propertyData: PropertyData) => void;
}

interface WebLookupData {
  listedPrice?: number;
  estimatedValue?: number;
  listingStatus?: 'Active' | 'Pending' | 'Sold' | 'Off Market';
  daysOnMarket?: number;
  pricePerSqft?: number;
  listingUrl?: string;
  source?: string;
  lastSoldPrice?: number;
  lastSoldDate?: string;
  imageUrl?: string;
}

interface PropertyData {
  address: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  yearBuilt?: number;
  propertyType?: string;
  lastSalePrice?: number;
  assessedValue?: number;
  propertyTaxes?: number;
  nearbyRentals?: number[];
  medianRent?: number;
  rentalCount?: number;
  aiEstimates?: Record<string, number>;
  estimatingAi?: boolean;
  webLookup?: WebLookupData;
  fetchingWeb?: boolean;
}

async function fetchWebLookup(address: string, url?: string): Promise<WebLookupData> {
  try {
    const res = await fetch(WEB_LOOKUP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ address, url }),
    });
    if (!res.ok) return {};
    const { webData } = await res.json();
    // Coerce numeric fields
    return {
      listedPrice: toNumber(webData?.listedPrice),
      estimatedValue: toNumber(webData?.estimatedValue),
      listingStatus: webData?.listingStatus ?? undefined,
      daysOnMarket: toNumber(webData?.daysOnMarket),
      pricePerSqft: toNumber(webData?.pricePerSqft),
      listingUrl: typeof webData?.listingUrl === 'string' ? webData.listingUrl : undefined,
      source: typeof webData?.source === 'string' ? webData.source : undefined,
      lastSoldPrice: toNumber(webData?.lastSoldPrice),
      lastSoldDate: typeof webData?.lastSoldDate === 'string' ? webData.lastSoldDate : undefined,
      imageUrl: typeof webData?.imageUrl === 'string' && (webData.imageUrl.startsWith('http') || webData.imageUrl.startsWith('data:')) ? webData.imageUrl : undefined,
    };
  } catch {
    return {};
  }
}

function toNumber(val: unknown): number | undefined {
  if (val == null) return undefined;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const n = parseFloat(val.replace(/[^0-9.]/g, ''));
    return isNaN(n) ? undefined : n;
  }
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    for (const key of ['annual', 'total', 'amount', 'value', 'yearly']) {
      const n = toNumber(obj[key]);
      if (n !== undefined) return n;
    }
    for (const v of Object.values(obj)) {
      const n = toNumber(v);
      if (n !== undefined) return n;
    }
  }
  return undefined;
}

function extractAddressFromUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed.startsWith('http')) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname.includes('zillow.com')) {
      const match = url.pathname.match(/\/homedetails\/([^/]+)\//);
      if (match) return match[1].replace(/-/g, ' ').replace(/\b(\w)/g, c => c.toUpperCase());
    }
    if (url.hostname.includes('realtor.com')) {
      const match = url.pathname.match(/\/realestateandhomes-detail\/([^/]+)/);
      if (match) return match[1].replace(/_M[\w\d-]+$/, '').replace(/_/g, ', ').replace(/-/g, ' ');
    }
    if (url.hostname.includes('redfin.com')) {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length >= 3) return parts[2].replace(/-/g, ' ');
    }
  } catch { /* treat as address */ }
  return trimmed;
}

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

async function fetchPropertyData(address: string, apiKey: string): Promise<PropertyData> {
  const headers = { 'X-Api-Key': apiKey, Accept: 'application/json' };
  const propRes = await fetch(
    `https://api.rentcast.io/v1/properties?address=${encodeURIComponent(address)}&limit=1`,
    { headers }
  );
  if (!propRes.ok) throw new Error(`RentCast property lookup failed (${propRes.status})`);
  const propData = await propRes.json();
  const prop = Array.isArray(propData) ? propData[0] : propData;
  if (!prop) throw new Error('No property found for that address.');

  const rentRes = await fetch(
    `https://api.rentcast.io/v1/listings/rental/long-term?address=${encodeURIComponent(prop.formattedAddress ?? address)}&radius=2&status=Active&limit=50`,
    { headers }
  );
  let nearbyRentals: number[] = [];
  if (rentRes.ok) {
    const rentData = await rentRes.json();
    const listings = Array.isArray(rentData) ? rentData : rentData.listings ?? [];
    nearbyRentals = listings.map((l: any) => Number(l.price)).filter((p: number) => p > 100);
  }

  return {
    address: prop.formattedAddress ?? address,
    bedrooms: toNumber(prop.bedrooms),
    bathrooms: toNumber(prop.bathrooms),
    squareFootage: toNumber(prop.squareFootage),
    yearBuilt: toNumber(prop.yearBuilt),
    propertyType: prop.propertyType,
    lastSalePrice: toNumber(prop.lastSalePrice),
    assessedValue: toNumber(prop.assessedValue),
    propertyTaxes: toNumber(prop.propertyTaxes),
    nearbyRentals,
    medianRent: nearbyRentals.length ? median(nearbyRentals) : undefined,
    rentalCount: nearbyRentals.length,
  };
}

function InfoRow({ label, value, isAi }: { label: string; value: string; isAi?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        {isAi && <Sparkles className="w-2.5 h-2.5 text-primary/60" />}
        <span className="text-xs font-semibold text-foreground">{value}</span>
      </div>
    </div>
  );
}

interface AddressSuggestion {
  display_name: string;
  lat: string;
  lon: string;
}

export function PropertyImport({ updateField, onOpenAiAnalysis }: PropertyImportProps) {
  const [open, setOpen] = useState(true); // open by default
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<PropertyData | null>(null);
  const [imported, setImported] = useState(false);

  const apiKey = import.meta.env.VITE_RENTCAST_API_KEY ?? '';
  const canAction = !loading && !!input.trim();

  const searchAddress = useCallback(async (query: string) => {
    if (query.length < 3) { setSuggestions([]); return; }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&countrycodes=us&q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await res.json();
      setSuggestions(data);
    } catch {
      setSuggestions([]);
    }
  }, []);

  const handleInputChange = (val: string) => {
    setInput(val);
    setData(null);
    setImported(false);
    setError('');
    // Only show suggestions when not a URL
    if (val.trim().startsWith('http')) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAddress(val), 300);
  };

  const selectSuggestion = (s: AddressSuggestion) => {
    setInput(s.display_name);
    setSuggestions([]);
  };

  const handleFetch = async () => {
    if (!input.trim()) return;
    setError('');
    setData(null);
    setImported(false);
    setLoading(true);
    try {
      const address = extractAddressFromUrl(input.trim());

      // Run RentCast lookup and web lookup in parallel
      const [result] = await Promise.all([
        fetchPropertyData(address, apiKey),
      ]);

      // Show RentCast data immediately, mark web lookup as in-progress
      setData({ ...result, fetchingWeb: true });
      setLoading(false);

      // Run web lookup + AI estimates in parallel
      const missingFields: string[] = [];
      if (!result.lastSalePrice && !result.assessedValue) missingFields.push('purchasePrice');
      if (!result.medianRent) missingFields.push('rentPerUnit');
      if (result.propertyTaxes == null) missingFields.push('propertyTaxes');
      missingFields.push('insurance');
      missingFields.push('maintenanceCapex');

      const [webLookup, aiEstimates] = await Promise.all([
        fetchWebLookup(address, input.trim().startsWith('http') ? input.trim() : undefined),
        missingFields.length ? fetchAiEstimates(result, missingFields) : Promise.resolve({}),
      ]);

      setData(prev => prev ? {
        ...prev,
        webLookup,
        fetchingWeb: false,
        ...(Object.keys(aiEstimates).length ? { aiEstimates, estimatingAi: false } : {}),
      } : prev);
    } catch (e: any) {
      setError(e.message ?? 'Failed to fetch property data.');
      setLoading(false);
    }
  };

  const handleOpenAiAnalysis = () => {
    const addr = data?.address ?? extractAddressFromUrl(input.trim());
    if (!addr) return;
    onOpenAiAnalysis(addr, data ?? { address: addr });
  };

  const handleImport = () => {
    if (!data) return;
    const ai = data.aiEstimates ?? {};
    const web = data.webLookup ?? {};
    // Priority: web listed price > web estimated value > RentCast last sale > assessed > AI estimate
    const purchasePrice = web.listedPrice ?? web.estimatedValue ?? data.lastSalePrice ?? data.assessedValue ?? ai.purchasePrice;
    const rentPerUnit = data.medianRent ?? ai.rentPerUnit;
    const propertyTaxes = data.propertyTaxes ?? ai.propertyTaxes;
    if (purchasePrice) updateField('purchasePrice', Math.round(purchasePrice));
    if (rentPerUnit) updateField('rentPerUnit', Math.round(rentPerUnit));
    if (propertyTaxes) updateField('propertyTaxes', Math.round(propertyTaxes));
    if (ai.insurance) updateField('insurance', Math.round(ai.insurance));
    if (ai.maintenanceCapex) updateField('maintenanceCapex', Math.round(ai.maintenanceCapex));
    setImported(true);
    toast.success('Property data imported into calculator!');
    setTimeout(() => setOpen(false), 800);
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Link className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">Import from Zillow / Realtor.com</p>
            <p className="text-[11px] text-muted-foreground">Paste a listing URL or address · Look up data or run AI analysis</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-border/50">

          {/* ── Address input + action buttons ── */}
          <div className="pt-4 space-y-2">
            {/* Address box */}
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={input}
                onChange={e => handleInputChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { setSuggestions([]); handleFetch(); } }}
                placeholder="Paste Zillow / Realtor / Redfin URL — or type a US address..."
                className="w-full h-11 rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {suggestions.length > 0 && (
                <div className="absolute z-20 w-full bg-card border border-border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto top-full">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors border-b border-border/50 last:border-0 flex items-start gap-2"
                      onMouseDown={e => { e.preventDefault(); selectSuggestion(s); }}
                    >
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="leading-snug">{s.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Side-by-side action buttons */}
            <div className="grid grid-cols-2 gap-2">
              {/* Look Up */}
              <Button
                onClick={handleFetch}
                disabled={!canAction}
                variant="outline"
                className="h-10 text-sm"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Looking up...</>
                  : <><Download className="w-4 h-4 mr-2" /> Look Up Property</>
                }
              </Button>

              {/* AI Deal Analysis — prominent */}
              <button
                onClick={handleOpenAiAnalysis}
                disabled={!canAction}
                className={cn(
                  'relative h-10 flex items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-all',
                  canAction
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md'
                    : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                )}
              >
                <Zap className="w-4 h-4 shrink-0" />
                <span>One Click AI Analysis</span>
                <Sparkles className="w-3.5 h-3.5 shrink-0 opacity-80" />
              </button>
            </div>

            <p className="text-[10px] text-muted-foreground">
              Supports: zillow.com · realtor.com · redfin.com · or type any US address
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive text-xs rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* ── Results ── */}
          {data && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">

              {/* Property card */}
              <div className="rounded-xl border border-border bg-accent/30 overflow-hidden">
                {/* Address bar */}
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50 bg-accent/40">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <p className="text-xs font-medium text-foreground leading-snug truncate">{data.address}</p>
                  {data.propertyType && (
                    <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                      {data.propertyType}{data.yearBuilt ? ` · ${data.yearBuilt}` : ''}
                    </span>
                  )}
                </div>

                {/* Price + photo side by side */}
                <div className="flex">
                  {/* Price section — left side */}
                  <div className="flex-1 min-w-0 px-4 pt-3 pb-3 space-y-3">

                  {/* Current listing from web search */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Globe className="w-3 h-3 text-primary" />
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Current Market Price
                        {data.webLookup?.source && (
                          <span className="normal-case font-normal ml-1">· via {data.webLookup.source}</span>
                        )}
                      </p>
                      {data.fetchingWeb && (
                        <Loader2 className="w-3 h-3 animate-spin text-primary ml-auto" />
                      )}
                    </div>

                    {data.fetchingWeb && !data.webLookup && (
                      <p className="text-sm text-muted-foreground italic">Searching Zillow / Redfin...</p>
                    )}

                    {data.webLookup && (
                      <>
                        {data.webLookup.listedPrice ? (
                          <div className="flex items-end gap-3">
                            <p className="text-2xl font-bold text-foreground">
                              ${data.webLookup.listedPrice.toLocaleString()}
                            </p>
                            <div className="flex items-center gap-2 mb-0.5">
                              {data.webLookup.listingStatus && (
                                <span className={cn(
                                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                                  data.webLookup.listingStatus === 'Active' && 'bg-green-500/15 text-green-600',
                                  data.webLookup.listingStatus === 'Pending' && 'bg-amber-500/15 text-amber-600',
                                  data.webLookup.listingStatus === 'Sold' && 'bg-red-500/15 text-red-600',
                                  data.webLookup.listingStatus === 'Off Market' && 'bg-muted text-muted-foreground',
                                )}>
                                  {data.webLookup.listingStatus}
                                </span>
                              )}
                              {data.webLookup.daysOnMarket != null && (
                                <span className="text-[10px] text-muted-foreground">{data.webLookup.daysOnMarket}d on market</span>
                              )}
                              {data.webLookup.pricePerSqft && (
                                <span className="text-[10px] text-muted-foreground">${data.webLookup.pricePerSqft}/sqft</span>
                              )}
                            </div>
                          </div>
                        ) : data.webLookup.estimatedValue ? (
                          <div className="flex items-end gap-3">
                            <p className="text-2xl font-bold text-foreground">
                              ${data.webLookup.estimatedValue.toLocaleString()}
                            </p>
                            <span className="text-[10px] text-muted-foreground mb-0.5">Est. market value</span>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">Not found online</p>
                        )}

                        {data.webLookup.listingUrl && (
                          <a
                            href={data.webLookup.listingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-0.5"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            View on {data.webLookup.source ?? 'listing site'}
                          </a>
                        )}
                      </>
                    )}
                  </div>

                  {/* RentCast last sale / assessed divider */}
                  {(data.lastSalePrice ?? data.assessedValue ?? data.webLookup?.lastSoldPrice) && (
                    <div className="pt-2 border-t border-border/40">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Last Sale / Assessed</p>
                      <div className="flex items-end gap-3">
                        <p className="text-base font-bold text-foreground">
                          ${(data.lastSalePrice ?? data.assessedValue ?? data.webLookup?.lastSoldPrice)!.toLocaleString()}
                        </p>
                        {data.webLookup?.lastSoldDate && (
                          <span className="text-[10px] text-muted-foreground mb-0.5">{data.webLookup.lastSoldDate}</span>
                        )}
                        {data.squareFootage && (data.lastSalePrice ?? data.assessedValue) && (
                          <span className="text-[10px] text-muted-foreground mb-0.5">
                            ${Math.round((data.lastSalePrice ?? data.assessedValue)! / data.squareFootage!)}/sqft
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Nothing found yet */}
                  {!data.fetchingWeb && !data.webLookup?.listedPrice && !data.webLookup?.estimatedValue && !data.lastSalePrice && !data.assessedValue && (
                    <p className="text-sm text-muted-foreground italic">Price not available — AI will estimate</p>
                  )}
                  </div>{/* end left price panel */}

                  {/* Property photo — right side */}
                  {data.webLookup?.imageUrl && (
                    <div className="w-32 shrink-0 border-l border-border/50 overflow-hidden relative">
                      <img
                        src={data.webLookup.imageUrl}
                        alt={`Front view of ${data.address}`}
                        className="w-full h-full object-cover"
                        onError={e => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = 'none'; }}
                      />
                      {data.webLookup.source && (
                        <span className="absolute bottom-1.5 left-0 right-0 text-center text-[9px] font-semibold bg-black/55 text-white py-0.5">
                          {data.webLookup.source}
                        </span>
                      )}
                    </div>
                  )}
                </div>{/* end flex row */}

                <div className="grid grid-cols-3 divide-x divide-border/50 border-t border-border/50 mt-1">
                  {[
                    { icon: <BedDouble className="w-4 h-4 text-primary" />, val: data.bedrooms ?? '—', label: 'Beds' },
                    { icon: <Bath className="w-4 h-4 text-primary" />, val: data.bathrooms ?? '—', label: 'Baths' },
                    { icon: <Home className="w-4 h-4 text-primary" />, val: data.squareFootage ? data.squareFootage.toLocaleString() : '—', label: 'Sq Ft' },
                  ].map(({ icon, val, label }) => (
                    <div key={label} className="flex flex-col items-center py-2.5 gap-0.5">
                      {icon}
                      <p className="text-sm font-bold text-foreground">{val}</p>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fields to import */}
              <div className="bg-background rounded-lg border border-border/50 px-3 py-2 divide-y divide-border/40">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Fields to import</p>
                  {data.estimatingAi && (
                    <span className="flex items-center gap-1 text-[10px] text-primary">
                      <Sparkles className="w-3 h-3 animate-pulse" /> AI estimating...
                    </span>
                  )}
                </div>

                {(data.lastSalePrice ?? data.assessedValue) && (
                  <InfoRow label="Purchase Price" value={`$${(data.lastSalePrice ?? data.assessedValue)!.toLocaleString()}`} />
                )}
                {data.medianRent && (
                  <InfoRow label={`Rent/Unit (${data.rentalCount} nearby listings)`} value={`$${data.medianRent.toLocaleString()}/mo`} />
                )}
                {data.propertyTaxes && (
                  <InfoRow label="Property Taxes" value={`$${data.propertyTaxes.toLocaleString()}/yr`} />
                )}

                {data.aiEstimates && Object.keys(data.aiEstimates).length > 0 && (
                  <>
                    <div className="pt-2 pb-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        <Sparkles className="w-2.5 h-2.5" /> AI Estimated
                      </span>
                    </div>
                    {!data.lastSalePrice && !data.assessedValue && data.aiEstimates.purchasePrice && (
                      <InfoRow label="Purchase Price (AI est.)" value={`$${data.aiEstimates.purchasePrice.toLocaleString()}`} isAi />
                    )}
                    {!data.medianRent && data.aiEstimates.rentPerUnit && (
                      <InfoRow label="Rent/Unit (AI est.)" value={`$${data.aiEstimates.rentPerUnit.toLocaleString()}/mo`} isAi />
                    )}
                    {!data.propertyTaxes && data.aiEstimates.propertyTaxes && (
                      <InfoRow label="Property Taxes (AI est.)" value={`$${data.aiEstimates.propertyTaxes.toLocaleString()}/yr`} isAi />
                    )}
                    {data.aiEstimates.insurance && (
                      <InfoRow label="Insurance (AI est.)" value={`$${data.aiEstimates.insurance.toLocaleString()}/yr`} isAi />
                    )}
                    {data.aiEstimates.maintenanceCapex && (
                      <InfoRow label="Maintenance/CapEx (AI est.)" value={`$${data.aiEstimates.maintenanceCapex.toLocaleString()}/yr`} isAi />
                    )}
                    {/* Disclaimer for AI-estimated fields */}
                    <div className="flex items-start gap-1.5 pt-2">
                      <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        AI estimates are approximations based on location and market data. Always verify with a licensed appraiser, tax professional, or local agent before making investment decisions.
                      </p>
                    </div>
                  </>
                )}

                {!data.lastSalePrice && !data.assessedValue && !data.medianRent && !data.propertyTaxes && !data.aiEstimates && !data.estimatingAi && (
                  <p className="text-xs text-muted-foreground py-2">No importable fields found for this property.</p>
                )}
              </div>

              {/* Nearby rentals */}
              {data.nearbyRentals && data.nearbyRentals.length > 0 && (
                <div className="bg-primary/5 rounded-lg px-3 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Nearby Rentals (2-mile radius)</p>
                      <p className="text-[10px] text-muted-foreground">
                        {data.rentalCount} active listings · Range: ${Math.min(...data.nearbyRentals).toLocaleString()} – ${Math.max(...data.nearbyRentals).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-primary">${data.medianRent?.toLocaleString()}/mo</span>
                </div>
              )}

              {/* ── Action buttons side by side ── */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleImport}
                  disabled={imported || !!data.estimatingAi}
                  variant={imported ? 'outline' : 'outline'}
                  className="h-11"
                >
                  {imported
                    ? <><CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> Imported</>
                    : <><Download className="w-4 h-4 mr-2" /> Import to Calculator</>
                  }
                </Button>

                <button
                  onClick={handleOpenAiAnalysis}
                  className="h-11 flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-sm hover:shadow-md px-3"
                >
                  <Zap className="w-4 h-4 shrink-0" />
                  <span className="truncate">One Click AI Analysis</span>
                  <Sparkles className="w-3.5 h-3.5 shrink-0 opacity-80" />
                </button>
              </div>

              {/* Due diligence reminder */}
              <div className="flex items-start gap-2 bg-amber-500/8 border border-amber-500/20 rounded-lg px-3 py-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">Due Diligence Required.</span> All figures shown are estimates for analysis purposes only. Verify purchase price, rental rates, taxes, and expenses with a licensed real estate agent, appraiser, and tax professional before investing.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
