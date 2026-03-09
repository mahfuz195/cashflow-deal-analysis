import { useState, useCallback } from 'react';
import { Search, MapPin, BedDouble, Bath, ArrowRight, TrendingUp, TrendingDown, Minus, BarChart3, Key, Home, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface RentEstimatorTabProps {
  onUseRent: (rent: number) => void;
}

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
}

interface RentResult {
  rent: number;
  rentRangeLow: number;
  rentRangeHigh: number;
  rentPerSqft?: number;
  listings: number;
  address?: string;
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

// Simulated API call — replace body with real RentCast fetch when key is provided
async function fetchRentEstimate(
  address: string,
  bedrooms: number,
  bathrooms: number,
  apiKey: string,
): Promise<RentResult> {
  if (apiKey) {
    const params = new URLSearchParams({
      address,
      bedrooms: String(bedrooms),
      bathrooms: String(bathrooms),
      propertyType: 'Single Family',
    });
    const res = await fetch(`https://api.rentcast.io/v1/avm/rent/long-term?${params}`, {
      headers: { 'X-Api-Key': apiKey, Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`RentCast error ${res.status}`);
    const data = await res.json();
    return {
      rent: Math.round(data.rent ?? 0),
      rentRangeLow: Math.round(data.rentRangeLow ?? data.rent * 0.85),
      rentRangeHigh: Math.round(data.rentRangeHigh ?? data.rent * 1.15),
      listings: data.comparables?.length ?? 0,
      address: data.address,
    };
  }

  // Mock fallback
  await new Promise(r => setTimeout(r, 1200));
  const base = 1000 + bedrooms * 300 + bathrooms * 150 + Math.random() * 500;
  return {
    rent: Math.round(base),
    rentRangeLow: Math.round(base * 0.82),
    rentRangeHigh: Math.round(base * 1.18),
    rentPerSqft: parseFloat((base / (900 + bedrooms * 200)).toFixed(2)),
    listings: Math.floor(12 + Math.random() * 30),
    address,
  };
}

async function fetchMarketData(zip: string, apiKey: string): Promise<MarketResult> {
  if (apiKey) {
    const res = await fetch(`https://api.rentcast.io/v1/markets?zipCode=${zip}&historyRange=1`, {
      headers: { 'X-Api-Key': apiKey, Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`RentCast error ${res.status}`);
    const data = await res.json();
    const avg = data.averageRent ?? 1500;
    const med = data.medianRent ?? avg;
    return {
      medianRent: Math.round(med),
      avgRent: Math.round(avg),
      minRent: Math.round(avg * 0.65),
      maxRent: Math.round(avg * 1.5),
      vacancyRate: data.vacancyRate ?? 5.2,
      daysOnMarket: data.daysOnMarket ?? 18,
      totalListings: data.totalListings ?? 45,
      rentTrend: data.rentTrend ?? 3.4,
      marketCondition: data.vacancyRate < 4 ? 'hot' : data.vacancyRate > 7 ? 'cool' : 'balanced',
      rentPerSqft: data.averageRentPerSqft ?? parseFloat((avg / 1100).toFixed(2)),
      zip,
    };
  }

  // Mock fallback
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
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_RENTCAST_API_KEY ?? '');
  const [showKey, setShowKey] = useState(false);
  const hasEnvKey = !!import.meta.env.VITE_RENTCAST_API_KEY;

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
        const res = await fetchRentEstimate(selectedAddress, bedrooms, bathrooms, apiKey);
        setRentResult(res);
        setMarketResult(null);
      } else {
        if (!zip.match(/^\d{5}$/)) { setError('Please enter a valid 5-digit ZIP code.'); setLoading(false); return; }
        const res = await fetchMarketData(zip, apiKey);
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

      {/* RentCast API Key */}
      {!hasEnvKey && (
        <div className="bg-card rounded-lg border border-border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">RentCast API Key</span>
              <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">Optional</span>
            </div>
            <button onClick={() => setShowKey(p => !p)} className="text-[10px] text-primary hover:underline">
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
          {showKey && (
            <input
              type="text"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="Paste your RentCast API key for live data..."
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring font-mono"
            />
          )}
          {!showKey && (
            <p className="text-[10px] text-muted-foreground">
              {apiKey ? '● Key set — using live RentCast data' : 'Without a key, results are simulated estimates. Get a free key at rentcast.io.'}
            </p>
          )}
        </div>
      )}

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

          {!apiKey && (
            <p className="text-[10px] text-muted-foreground/60 text-center">
              ⚠ Simulated data — add a RentCast API key for live market estimates
            </p>
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

          {!apiKey && (
            <p className="text-[10px] text-muted-foreground/60 text-center">
              ⚠ Simulated data — add a RentCast API key above for live market data
            </p>
          )}

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
