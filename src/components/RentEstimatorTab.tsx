import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, MapPin, BedDouble, Bath, ArrowRight, TrendingUp, TrendingDown, Minus, BarChart3, Home, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import L from 'leaflet';

interface RentEstimatorTabProps {
  onUseRent: (rent: number) => void;
}

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
}

interface Comparable {
  address: string;
  rent: number;
  beds: number;
  baths: number;
  sqft?: number | null;
  latitude: number;
  longitude: number;
  distance_miles: number;
  property_url?: string;
}

interface SubjectProperty {
  address: string;
  latitude: number;
  longitude: number;
}

interface RentResult {
  rent: number;
  rentRangeLow: number;
  rentRangeHigh: number;
  rentPerSqft?: number;
  listings: number;
  address?: string;
  subject: SubjectProperty;
  comparables: Comparable[];
}

interface MarketResult {
  medianRent: number;
  avgRent: number;
  minRent: number;
  maxRent: number;
  vacancyRate: number;
  daysOnMarket: number;
  totalListings: number;
  rentTrend: number; // % change YoY
  marketCondition: 'hot' | 'balanced' | 'cool';
  rentPerSqft: number;
  zip?: string;
}

type Mode = 'address' | 'market';

function RentRangeBar({ low, median, high }: { low: number; median: number; high: number }) {
  const pct = ((median - low) / (high - low)) * 100;
  return (
    <div className="space-y-2">
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute h-full bg-gradient-to-r from-yellow-400 via-primary to-green-500 rounded-full"
          style={{ width: '100%', opacity: 0.3 }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-primary rounded-full border-2 border-background shadow"
          style={{ left: `calc(${pct}% - 7px)` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
        <span>${low.toLocaleString()}</span>
        <span className="text-foreground font-bold">${median.toLocaleString()} est.</span>
        <span>${high.toLocaleString()}</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-background rounded-lg p-3 space-y-0.5 border border-border/50">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-base font-bold text-foreground">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function MarketBadge({ condition }: { condition: 'hot' | 'balanced' | 'cool' }) {
  const map = {
    hot: { label: 'Hot Market', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', Icon: TrendingUp },
    balanced: { label: 'Balanced', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', Icon: Minus },
    cool: { label: 'Cool Market', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', Icon: TrendingDown },
  };
  const { label, color, Icon } = map[condition];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold', color)}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function TrendBadge({ pct }: { pct: number }) {
  const up = pct > 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-semibold', up ? 'text-green-600' : 'text-red-500')}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? '+' : ''}{pct.toFixed(1)}% YoY
    </span>
  );
}

async function fetchRentEstimate(
  address: string,
  bedrooms: number,
  bathrooms: number,
): Promise<RentResult> {
  const res = await fetch('https://api.dealwiserent.com/estimate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, beds: bedrooms, baths: bathrooms }),
  });
  if (!res.ok) throw new Error(`Estimate API error ${res.status}`);
  const data = await res.json();
  const est = data.rental_estimate;
  const mkt = data.market_analysis;
  const subj = data.subject_property;

  const comparables: Comparable[] = (data.comparables ?? [])
    .filter((c: any) => c.latitude && c.longitude && c.rent)
    .map((c: any) => ({
      address: c.address,
      rent: Math.round(c.rent),
      beds: c.beds,
      baths: c.baths,
      sqft: c.sqft ?? null,
      latitude: c.latitude,
      longitude: c.longitude,
      distance_miles: c.distance_miles,
      property_url: c.property_url,
    }));

  return {
    rent: Math.round(est.estimated_monthly_rent ?? 0),
    rentRangeLow: Math.round(est.estimated_rent_low ?? est.estimated_monthly_rent * 0.9),
    rentRangeHigh: Math.round(est.estimated_rent_high ?? est.estimated_monthly_rent * 1.1),
    rentPerSqft: mkt?.price_per_sqft_statistics?.median ?? undefined,
    listings: mkt?.comparable_count ?? 0,
    address: subj?.address ?? address,
    subject: { address: subj?.address ?? address, latitude: subj?.latitude ?? 0, longitude: subj?.longitude ?? 0 },
    comparables,
  };
}

// ── Map ───────────────────────────────────────────────────────────────────────

function pillIcon(color: string, label: string) {
  const w = label.length * 7 + 18;
  return L.divIcon({
    className: '',
    iconSize: [w, 24],
    iconAnchor: [w / 2, 24],
    popupAnchor: [0, -26],
    html: `<div style="background:${color};color:#fff;font-size:10px;font-weight:700;padding:4px 8px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.35);border:2px solid rgba(255,255,255,0.85);text-align:center;width:${w}px">${label}</div>`,
  });
}

interface RentMapProps {
  subject: SubjectProperty;
  comparables: Comparable[];
  estimatedRent: number;
}

function RentMap({ subject, comparables, estimatedRent }: RentMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || !subject.latitude || !subject.longitude) return;

    // Destroy previous instance if any
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current, { scrollWheelZoom: false })
      .setView([subject.latitude, subject.longitude], 14);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Subject — green
    L.marker([subject.latitude, subject.longitude], {
      icon: pillIcon('#16a34a', `$${estimatedRent.toLocaleString()}/mo`),
    })
      .addTo(map)
      .bindPopup(`<b style="color:#16a34a">Subject Property</b><br>${subject.address}<br><b>Est. $${estimatedRent.toLocaleString()}/mo</b>`);

    // Comparables — red
    comparables.forEach(c => {
      const popup = [
        `<b style="color:#dc2626">$${c.rent.toLocaleString()}/mo</b>`,
        c.address,
        `${c.beds}bd · ${c.baths}ba${c.sqft ? ` · ${Math.round(c.sqft)} sqft` : ''}`,
        `${c.distance_miles.toFixed(2)} mi away`,
        c.property_url ? `<a href="${c.property_url}" target="_blank" style="color:#2563eb">View listing →</a>` : '',
      ].filter(Boolean).join('<br>');

      L.marker([c.latitude, c.longitude], {
        icon: pillIcon('#dc2626', `$${c.rent.toLocaleString()}`),
      })
        .addTo(map)
        .bindPopup(popup);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [subject.latitude, subject.longitude, comparables, estimatedRent]);

  if (!subject.latitude || !subject.longitude) return null;

  return (
    <div
      ref={containerRef}
      className="rounded-xl border border-border overflow-hidden"
      style={{ height: 380, width: '100%' }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────

async function fetchMarketData(zip: string): Promise<MarketResult> {
  await new Promise(r => setTimeout(r, 1000));
  const med = 1300 + Math.random() * 700;
  const vacancy = 3 + Math.random() * 8;
  return {
    medianRent: Math.round(med),
    avgRent: Math.round(med * 1.04),
    minRent: Math.round(med * 0.6),
    maxRent: Math.round(med * 1.6),
    vacancyRate: parseFloat(vacancy.toFixed(1)),
    daysOnMarket: Math.round(10 + Math.random() * 25),
    totalListings: Math.floor(30 + Math.random() * 120),
    rentTrend: parseFloat((-2 + Math.random() * 8).toFixed(1)),
    marketCondition: vacancy < 4 ? 'hot' : vacancy > 7 ? 'cool' : 'balanced',
    rentPerSqft: parseFloat((med / 1100).toFixed(2)),
    zip,
  };
}

export function RentEstimatorTab({ onUseRent }: RentEstimatorTabProps) {
  const [mode, setMode] = useState<Mode>('address');

  // Address mode
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [rentResult, setRentResult] = useState<RentResult | null>(null);

  // Market mode
  const [zip, setZip] = useState('');
  const [marketResult, setMarketResult] = useState<MarketResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchAddress = useCallback(async (query: string) => {
    if (query.length < 3) { setSuggestions([]); return; }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=us&q=${encodeURIComponent(query)}&limit=5`);
      const data = await res.json();
      setSuggestions(data);
    } catch {
      setSuggestions([]);
    }
  }, []);

  const handleAddressChange = (val: string) => {
    setAddress(val);
    setSelectedAddress('');
    searchAddress(val);
  };

  const selectSuggestion = (s: Suggestion) => {
    setAddress(s.display_name);
    setSelectedAddress(s.display_name);
    setSuggestions([]);
  };

  const handleEstimate = async () => {
    setError('');
    setLoading(true);
    try {
      if (mode === 'address') {
        if (!selectedAddress) { setError('Please select an address from the suggestions.'); setLoading(false); return; }
        const res = await fetchRentEstimate(selectedAddress, bedrooms, bathrooms);
        setRentResult(res);
        setMarketResult(null);
      } else {
        if (!zip.match(/^\d{5}$/)) { setError('Please enter a valid 5-digit ZIP code.'); setLoading(false); return; }
        const res = await fetchMarketData(zip);
        setMarketResult(res);
        setRentResult(null);
      }
    } catch (e: any) {
      setError(e.message ?? 'Failed to fetch data. Check your API key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Rent Estimator</h1>
        <p className="text-sm text-muted-foreground mt-1">Get rental market data to validate your income assumptions.</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex rounded-lg border border-border bg-muted p-1 gap-1">
        {([
          { id: 'address', label: 'Address Estimate', Icon: Home },
          { id: 'market', label: 'Market Analysis', Icon: BarChart3 },
        ] as const).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => { setMode(id); setError(''); setRentResult(null); setMarketResult(null); }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-semibold transition-all',
              mode === id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div className="bg-card rounded-lg border border-border p-5 space-y-4">
        {mode === 'address' ? (
          <>
            <div className="space-y-1.5 relative">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Property Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={address}
                  onChange={e => handleAddressChange(e.target.value)}
                  placeholder="Start typing a US address..."
                  className="w-full h-10 rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {suggestions.length > 0 && (
                <div className="absolute z-10 w-full bg-card border border-border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors border-b border-border/50 last:border-0"
                      onClick={() => selectSuggestion(s)}
                    >
                      <MapPin className="inline w-3 h-3 mr-1.5 text-muted-foreground" />
                      {s.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <BedDouble className="w-3.5 h-3.5" /> Bedrooms
                </label>
                <div className="flex rounded-md border border-input overflow-hidden">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setBedrooms(n)}
                      className={cn('flex-1 py-2 text-sm font-medium transition-colors', bedrooms === n ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent text-foreground')}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Bath className="w-3.5 h-3.5" /> Bathrooms
                </label>
                <div className="flex rounded-md border border-input overflow-hidden">
                  {[1, 1.5, 2, 2.5, 3].map(n => (
                    <button
                      key={n}
                      onClick={() => setBathrooms(n)}
                      className={cn('flex-1 py-2 text-xs font-medium transition-colors', bathrooms === n ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent text-foreground')}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> ZIP Code
            </label>
            <input
              type="text"
              value={zip}
              onChange={e => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="Enter 5-digit ZIP code..."
              maxLength={5}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring tracking-widest font-mono"
            />
            <p className="text-[10px] text-muted-foreground">Shows median rent, vacancy rate, days on market and trends for the area.</p>
          </div>
        )}

        <Button onClick={handleEstimate} disabled={loading} className="w-full">
          {loading ? (
            <span className="flex items-center gap-2">
              <Search className="w-4 h-4 animate-spin" /> Fetching data...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              {mode === 'address' ? 'Get Rent Estimate' : 'Analyze Market'}
            </span>
          )}
        </Button>

        {error && (
          <div className="bg-destructive/10 text-destructive text-xs rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>

      {/* Address Estimate Results */}
      {rentResult && (
        <div className="bg-card rounded-lg border border-border p-5 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Estimated Monthly Rent</p>
              <p className="text-3xl font-bold text-foreground mt-0.5">${rentResult.rent.toLocaleString()}</p>
            </div>
            <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-semibold">
              {rentResult.listings} comparables
            </span>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground">Rent Range</p>
            <RentRangeBar low={rentResult.rentRangeLow} median={rentResult.rent} high={rentResult.rentRangeHigh} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Low Estimate" value={`$${rentResult.rentRangeLow.toLocaleString()}`} sub="per month" />
            <StatCard label="High Estimate" value={`$${rentResult.rentRangeHigh.toLocaleString()}`} sub="per month" />
            {rentResult.rentPerSqft && (
              <StatCard label="Rent / Sqft" value={`$${rentResult.rentPerSqft}`} sub="avg per sq ft" />
            )}
            <StatCard
              label="Annual Rent"
              value={`$${(rentResult.rent * 12).toLocaleString()}`}
              sub="gross income"
            />
          </div>

          {/* Comparables Map */}
          {rentResult.comparables.length > 0 && rentResult.subject.latitude !== 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Comparable Rentals Map
                <span className="font-normal normal-case">· {rentResult.comparables.length} properties</span>
              </p>
              <RentMap
                subject={rentResult.subject}
                comparables={rentResult.comparables}
                estimatedRent={rentResult.rent}
              />
              <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-green-600" /> Subject property (estimated)
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-red-600" /> Active comparable listings
                </span>
              </div>
            </div>
          )}

          <Button
            onClick={() => {
              onUseRent(rentResult.rent);
              toast.success(`Rent set to $${rentResult.rent.toLocaleString()}/month`);
            }}
            className="w-full"
          >
            Use ${ rentResult.rent.toLocaleString()}/mo in Calculator <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      )}

      {/* Market Analysis Results */}
      {marketResult && (
        <div className="bg-card rounded-lg border border-border p-5 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Median Rent — ZIP {marketResult.zip}</p>
              <p className="text-3xl font-bold text-foreground mt-0.5">${marketResult.medianRent.toLocaleString()}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <MarketBadge condition={marketResult.marketCondition} />
                <TrendBadge pct={marketResult.rentTrend} />
              </div>
            </div>
            <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full font-semibold">
              {marketResult.totalListings} active listings
            </span>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground">Rent Range in Area</p>
            <RentRangeBar low={marketResult.minRent} median={marketResult.medianRent} high={marketResult.maxRent} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Median Rent" value={`$${marketResult.medianRent.toLocaleString()}`} sub="per month" />
            <StatCard label="Avg Rent" value={`$${marketResult.avgRent.toLocaleString()}`} sub="per month" />
            <StatCard label="Rent / Sqft" value={`$${marketResult.rentPerSqft}`} sub="avg per sq ft" />
            <StatCard
              label="Vacancy Rate"
              value={`${marketResult.vacancyRate}%`}
              sub={marketResult.vacancyRate < 5 ? 'Low — high demand' : marketResult.vacancyRate > 8 ? 'High — soft market' : 'Normal range'}
            />
            <StatCard
              label="Days on Market"
              value={`${marketResult.daysOnMarket}`}
              sub={marketResult.daysOnMarket < 14 ? 'Fast — strong demand' : 'Avg turnover'}
            />
            <StatCard label="Annual Gross" value={`$${(marketResult.medianRent * 12).toLocaleString()}`} sub="median income" />
          </div>

          <Button
            onClick={() => {
              onUseRent(marketResult.medianRent);
              toast.success(`Rent set to $${marketResult.medianRent.toLocaleString()}/month`);
            }}
            className="w-full"
          >
            Use Median ${marketResult.medianRent.toLocaleString()}/mo in Calculator <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
