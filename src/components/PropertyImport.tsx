import { useState } from 'react';
import { Link, MapPin, Download, Home, BedDouble, Bath, DollarSign, ChevronDown, ChevronUp, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalculatorState } from '@/types/calculator';
import { toast } from 'sonner';

const ESTIMATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/property-estimate`;

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
  // from listings
  nearbyRentals?: number[];
  medianRent?: number;
  rentalCount?: number;
  // AI estimates for missing fields
  aiEstimates?: Record<string, number>;
  estimatingAi?: boolean;
}

/** Safely coerce any RentCast field value to a number, handling nested objects */
function toNumber(val: unknown): number | undefined {
  if (val == null) return undefined;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const n = parseFloat(val.replace(/[^0-9.]/g, ''));
    return isNaN(n) ? undefined : n;
  }
  if (typeof val === 'object') {
    // Try common keys first
    const obj = val as Record<string, unknown>;
    for (const key of ['annual', 'total', 'amount', 'value', 'yearly']) {
      const n = toNumber(obj[key]);
      if (n !== undefined) return n;
    }
    // Fall back to first numeric value found
    for (const v of Object.values(obj)) {
      const n = toNumber(v);
      if (n !== undefined) return n;
    }
  }
  return undefined;
}

function extractAddressFromUrl(input: string): string {
  const trimmed = input.trim();

  // Already an address (not a URL)
  if (!trimmed.startsWith('http')) return trimmed;

  try {
    const url = new URL(trimmed);

    // Zillow: /homedetails/123-Main-St-City-ST-12345/zpid/
    if (url.hostname.includes('zillow.com')) {
      const match = url.pathname.match(/\/homedetails\/([^/]+)\//);
      if (match) {
        return match[1]
          .replace(/-/g, ' ')
          .replace(/\b(\w)/g, c => c.toUpperCase());
      }
    }

    // Realtor.com: /realestateandhomes-detail/123-Main-St_City_ST_12345_M.../
    if (url.hostname.includes('realtor.com')) {
      const match = url.pathname.match(/\/realestateandhomes-detail\/([^/]+)/);
      if (match) {
        return match[1]
          .replace(/_M[\w\d]+$/, '')   // strip trailing _M12345
          .replace(/_/g, ', ')
          .replace(/-/g, ' ');
      }
    }

    // Redfin: /CA/City/123-Main-St-12345/home/...
    if (url.hostname.includes('redfin.com')) {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length >= 3) {
        const addressPart = parts[2];
        return addressPart.replace(/-/g, ' ');
      }
    }
  } catch { /* not a valid URL, treat as address */ }

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

  // 1. Property details
  const propRes = await fetch(
    `https://api.rentcast.io/v1/properties?address=${encodeURIComponent(address)}&limit=1`,
    { headers }
  );
  if (!propRes.ok) throw new Error(`RentCast property lookup failed (${propRes.status})`);
  const propData = await propRes.json();
  const prop = Array.isArray(propData) ? propData[0] : propData;
  if (!prop) throw new Error('No property found for that address.');

  // 2. Nearby for-rent listings (2-mile radius)
  const rentRes = await fetch(
    `https://api.rentcast.io/v1/listings/rental/long-term?address=${encodeURIComponent(prop.formattedAddress ?? address)}&radius=2&status=Active&limit=50`,
    { headers }
  );
  let nearbyRentals: number[] = [];
  if (rentRes.ok) {
    const rentData = await rentRes.json();
    const listings = Array.isArray(rentData) ? rentData : rentData.listings ?? [];
    nearbyRentals = listings
      .map((l: any) => Number(l.price))
      .filter((p: number) => p > 100);
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold text-foreground">{value}</span>
    </div>
  );
}

export function PropertyImport({ updateField }: PropertyImportProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<PropertyData | null>(null);
  const [imported, setImported] = useState(false);

  const apiKey = import.meta.env.VITE_RENTCAST_API_KEY ?? '';

  const handleFetch = async () => {
    if (!input.trim()) return;
    setError('');
    setData(null);
    setImported(false);
    setLoading(true);
    try {
      const address = extractAddressFromUrl(input.trim());
      const result = await fetchPropertyData(address, apiKey);
      setData(result);
      setLoading(false);

      // Determine which key fields are missing and ask AI to estimate them
      const missingFields: string[] = [];
      if (!result.lastSalePrice && !result.assessedValue) missingFields.push('purchasePrice');
      if (!result.medianRent) missingFields.push('rentPerUnit');
      if (result.propertyTaxes == null) missingFields.push('propertyTaxes'); // always AI-estimate if missing
      missingFields.push('insurance');
      missingFields.push('maintenanceCapex');

      if (missingFields.length) {
        setData(prev => prev ? { ...prev, estimatingAi: true } : prev);
        const aiEstimates = await fetchAiEstimates(result, missingFields);
        setData(prev => prev ? { ...prev, aiEstimates, estimatingAi: false } : prev);
      }
    } catch (e: any) {
      setError(e.message ?? 'Failed to fetch property data.');
      setLoading(false);
    }
  };

  const handleImport = () => {
    if (!data) return;
    const ai = data.aiEstimates ?? {};

    const purchasePrice = data.lastSalePrice ?? data.assessedValue ?? ai.purchasePrice;
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
            <p className="text-[11px] text-muted-foreground">Paste a listing URL or address to auto-fill the calculator</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-border/50">
          {/* Input */}
          <div className="pt-4 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={input}
                  onChange={e => { setInput(e.target.value); setData(null); setImported(false); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleFetch()}
                  placeholder="Paste Zillow/Realtor URL or type address..."
                  className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <Button onClick={handleFetch} disabled={loading || !input.trim()} className="shrink-0 h-10">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Look Up'}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Supports: zillow.com, realtor.com, redfin.com URLs — or just type a US address
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive text-xs rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Results preview */}
          {data && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              {/* Property card — price + details */}
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

                {/* Listed price — prominent */}
                <div className="px-4 pt-3 pb-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Listed / Last Sale Price</p>
                  {(data.lastSalePrice ?? data.assessedValue) ? (
                    <div className="flex items-end gap-3 mt-0.5">
                      <p className="text-2xl font-bold text-foreground">
                        ${(data.lastSalePrice ?? data.assessedValue)!.toLocaleString()}
                      </p>
                      {data.squareFootage && (data.lastSalePrice ?? data.assessedValue) && (
                        <p className="text-xs text-muted-foreground mb-0.5">
                          ${Math.round((data.lastSalePrice ?? data.assessedValue)! / data.squareFootage!)}/sqft
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic mt-0.5">Not available — AI will estimate</p>
                  )}
                </div>

                {/* Beds / Baths / Sqft row */}
                <div className="grid grid-cols-3 divide-x divide-border/50 border-t border-border/50 mt-1">
                  <div className="flex flex-col items-center py-2.5 gap-0.5">
                    <BedDouble className="w-4 h-4 text-primary" />
                    <p className="text-sm font-bold text-foreground">{data.bedrooms ?? '—'}</p>
                    <p className="text-[10px] text-muted-foreground">Beds</p>
                  </div>
                  <div className="flex flex-col items-center py-2.5 gap-0.5">
                    <Bath className="w-4 h-4 text-primary" />
                    <p className="text-sm font-bold text-foreground">{data.bathrooms ?? '—'}</p>
                    <p className="text-[10px] text-muted-foreground">Baths</p>
                  </div>
                  <div className="flex flex-col items-center py-2.5 gap-0.5">
                    <Home className="w-4 h-4 text-primary" />
                    <p className="text-sm font-bold text-foreground">
                      {data.squareFootage ? data.squareFootage.toLocaleString() : '—'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Sq Ft</p>
                  </div>
                </div>
              </div>

              {/* Fields that will be imported */}
              <div className="bg-background rounded-lg border border-border/50 px-3 py-2 divide-y divide-border/40">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Fields to import</p>
                  {data.estimatingAi && (
                    <span className="flex items-center gap-1 text-[10px] text-primary">
                      <Sparkles className="w-3 h-3 animate-pulse" /> AI estimating...
                    </span>
                  )}
                </div>

                {/* RentCast data */}
                {(data.lastSalePrice ?? data.assessedValue) && (
                  <InfoRow label="Purchase Price" value={`$${(data.lastSalePrice ?? data.assessedValue)!.toLocaleString()}`} />
                )}
                {data.medianRent && (
                  <InfoRow label={`Rent/Unit (${data.rentalCount} nearby listings)`} value={`$${data.medianRent.toLocaleString()}/mo`} />
                )}
                {data.propertyTaxes && (
                  <InfoRow label="Property Taxes" value={`$${data.propertyTaxes.toLocaleString()}/yr`} />
                )}

                {/* AI estimates */}
                {data.aiEstimates && Object.keys(data.aiEstimates).length > 0 && (
                  <>
                    <div className="pt-2 pb-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        <Sparkles className="w-2.5 h-2.5" /> AI Estimated
                      </span>
                    </div>
                    {!data.lastSalePrice && !data.assessedValue && data.aiEstimates.purchasePrice && (
                      <InfoRow label="Purchase Price (AI est.)" value={`$${data.aiEstimates.purchasePrice.toLocaleString()}`} />
                    )}
                    {!data.medianRent && data.aiEstimates.rentPerUnit && (
                      <InfoRow label="Rent/Unit (AI est.)" value={`$${data.aiEstimates.rentPerUnit.toLocaleString()}/mo`} />
                    )}
                    {!data.propertyTaxes && data.aiEstimates.propertyTaxes && (
                      <InfoRow label="Property Taxes (AI est.)" value={`$${data.aiEstimates.propertyTaxes.toLocaleString()}/yr`} />
                    )}
                    {data.aiEstimates.insurance && (
                      <InfoRow label="Insurance (AI est.)" value={`$${data.aiEstimates.insurance.toLocaleString()}/yr`} />
                    )}
                    {data.aiEstimates.maintenanceCapex && (
                      <InfoRow label="Maintenance/CapEx (AI est.)" value={`$${data.aiEstimates.maintenanceCapex.toLocaleString()}/yr`} />
                    )}
                  </>
                )}

                {!data.lastSalePrice && !data.assessedValue && !data.medianRent && !data.propertyTaxes && !data.aiEstimates && !data.estimatingAi && (
                  <p className="text-xs text-muted-foreground py-2">No importable fields found for this property.</p>
                )}
              </div>

              {/* Nearby rentals summary */}
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
                  <span className="text-sm font-bold text-primary">${data.medianRent?.toLocaleString()}</span>
                </div>
              )}

              {/* Import button */}
              <Button
                onClick={handleImport}
                disabled={imported || !!data.estimatingAi}
                className="w-full"
                variant={imported ? 'outline' : 'default'}
              >
                {imported ? (
                  <><CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> Imported to Calculator</>
                ) : (
                  <><Download className="w-4 h-4 mr-2" /> Import to Calculator</>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
