import { useEffect, useState } from 'react';
import { X, Globe, TrendingUp, TrendingDown, Minus, CheckCircle2, Loader2, Sparkles, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalculatorState } from '@/types/calculator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const AI_DEAL_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-deal-analysis`;

// ── Inline calculation helpers (mirrors useCalculator logic) ──────────────────

function safeNum(v: number) {
  return isFinite(v) && !isNaN(v) ? v : 0;
}

function pmtCalc(annualRate: number, years: number, principal: number) {
  if (annualRate === 0) return principal / (years * 12);
  const r = annualRate / 100 / 12;
  const n = years * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function calcScenario(params: ScenarioInput): ScenarioMetrics {
  const {
    purchasePrice, rentPerUnit, numberOfUnits = 1,
    vacancyRate, interestRate, loanTerm = 30,
    downPaymentPercent, propertyTaxes, insurance,
    maintenanceCapex, propertyManagementFee,
    appreciationRate, annualRentIncrease = 2,
    closingCostPercent = 3,
  } = params;

  const downPayment = purchasePrice * (downPaymentPercent / 100);
  const loanAmount = purchasePrice - downPayment;
  const closingCosts = purchasePrice * (closingCostPercent / 100);
  const cashInvested = downPayment + closingCosts;

  const grossRentalIncome = rentPerUnit * numberOfUnits * 12;
  const effectiveGrossIncome = grossRentalIncome * (1 - vacancyRate / 100);

  const pmFee = effectiveGrossIncome * (propertyManagementFee / 100);
  const totalOperatingExpenses = propertyTaxes + insurance + maintenanceCapex + pmFee;
  const noi = effectiveGrossIncome - totalOperatingExpenses;

  const monthlyMortgage = loanAmount > 0 ? pmtCalc(interestRate, loanTerm, loanAmount) : 0;
  const annualDebtService = monthlyMortgage * 12;
  const annualCashFlow = noi - annualDebtService;
  const monthlyCashFlow = annualCashFlow / 12;

  const cocROI = safeNum(cashInvested > 0 ? (annualCashFlow / cashInvested) * 100 : 0);
  const capRate = safeNum(purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0);

  // Year-1 principal paid
  let balance = loanAmount;
  let principalPaid = 0;
  const mr = interestRate / 100 / 12;
  for (let i = 0; i < 12; i++) {
    const int = balance * mr;
    const prin = monthlyMortgage - int;
    principalPaid += prin;
    balance -= prin;
  }

  const totalROI = safeNum(cashInvested > 0 ? ((annualCashFlow + principalPaid) / cashInvested) * 100 : 0);

  // Equity at year 5 and 10
  function equityAtYear(year: number) {
    let bal = loanAmount;
    const mRate = interestRate / 100 / 12;
    const mPmt = monthlyMortgage;
    for (let m = 0; m < year * 12; m++) {
      const int = bal * mRate;
      const prin = Math.min(mPmt - int, bal);
      bal = Math.max(0, bal - prin);
    }
    const propValue = purchasePrice * Math.pow(1 + appreciationRate / 100, year);
    return { equity: propValue - bal, propValue, remainingDebt: bal };
  }

  // 5-year cumulative cash flow (with rent growth)
  let cumCF5 = 0;
  let cumCF10 = 0;
  let projEGI = effectiveGrossIncome;
  for (let y = 1; y <= 10; y++) {
    if (y > 1) projEGI = projEGI * (1 + annualRentIncrease / 100);
    const yPM = projEGI * (propertyManagementFee / 100);
    const yNOI = projEGI - (totalOperatingExpenses - pmFee + yPM);
    const yCF = yNOI - annualDebtService;
    if (y <= 5) cumCF5 += yCF;
    cumCF10 += yCF;
  }

  const eq5 = equityAtYear(5);
  const eq10 = equityAtYear(10);

  return {
    purchasePrice,
    downPayment,
    loanAmount,
    cashInvested,
    monthlyMortgage,
    monthlyCashFlow,
    annualCashFlow,
    cocROI,
    capRate,
    totalROI,
    noi,
    grossRentalIncome,
    effectiveGrossIncome,
    totalOperatingExpenses,
    equity5yr: eq5.equity,
    propValue5yr: eq5.propValue,
    equity10yr: eq10.equity,
    propValue10yr: eq10.propValue,
    cumCashFlow5yr: cumCF5,
    cumCashFlow10yr: cumCF10,
    rentPerUnit,
    vacancyRate,
    interestRate,
    downPaymentPercent,
    propertyTaxes,
    insurance,
    maintenanceCapex,
    propertyManagementFee,
    appreciationRate,
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScenarioInput {
  purchasePrice: number;
  rentPerUnit: number;
  numberOfUnits?: number;
  vacancyRate: number;
  interestRate: number;
  loanTerm?: number;
  downPaymentPercent: number;
  propertyTaxes: number;
  insurance: number;
  maintenanceCapex: number;
  propertyManagementFee: number;
  appreciationRate: number;
  annualRentIncrease?: number;
  closingCostPercent?: number;
}

interface ScenarioMetrics {
  purchasePrice: number;
  downPayment: number;
  loanAmount: number;
  cashInvested: number;
  monthlyMortgage: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  cocROI: number;
  capRate: number;
  totalROI: number;
  noi: number;
  grossRentalIncome: number;
  effectiveGrossIncome: number;
  totalOperatingExpenses: number;
  equity5yr: number;
  propValue5yr: number;
  equity10yr: number;
  propValue10yr: number;
  cumCashFlow5yr: number;
  cumCashFlow10yr: number;
  rentPerUnit: number;
  vacancyRate: number;
  interestRate: number;
  downPaymentPercent: number;
  propertyTaxes: number;
  insurance: number;
  maintenanceCapex: number;
  propertyManagementFee: number;
  appreciationRate: number;
}

interface MarketResearch {
  estimatedValue?: number;
  rentLow?: number;
  rentMedian?: number;
  rentHigh?: number;
  propertyTaxes?: number;
  insurance?: number;
  maintenanceCapex?: number;
  marketCondition?: 'Hot' | 'Balanced' | 'Cool';
  avgAreaCapRate?: number;
  rentTrend?: number;
  notes?: string;
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
  medianRent?: number;
  rentalCount?: number;
  aiEstimates?: Record<string, number>;
}

interface AIDealAnalysisProps {
  address: string;
  propertyData: PropertyData;
  updateField: <K extends keyof CalculatorState>(field: K, value: CalculatorState[K]) => void;
  onClose: () => void;
}

// ── Loading step animation ────────────────────────────────────────────────────

const LOADING_STEPS = [
  'Searching comparable sales in the area...',
  'Analyzing rental market rates...',
  'Researching property taxes & expenses...',
  'Calculating investment scenarios...',
];

function LoadingView() {
  const [stepIdx, setStepIdx] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setStepIdx(i => Math.min(i + 1, LOADING_STEPS.length - 1));
    }, 4000);
    const dotTimer = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 500);
    return () => { clearInterval(stepTimer); clearInterval(dotTimer); };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-primary" />
      </div>
      <div className="text-center space-y-2">
        <p className="text-sm font-semibold text-foreground">{LOADING_STEPS[stepIdx]}{dots}</p>
        <p className="text-xs text-muted-foreground">Using live web data for accuracy</p>
      </div>
      <div className="flex gap-2">
        {LOADING_STEPS.map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 rounded-full transition-all duration-500',
              i <= stepIdx ? 'w-6 bg-primary' : 'w-1.5 bg-muted'
            )}
          />
        ))}
      </div>
    </div>
  );
}

// ── Scenario card ─────────────────────────────────────────────────────────────

const SCENARIO_CONFIG = {
  conservative: {
    label: 'Conservative',
    subtitle: 'Worst-case protection',
    color: 'border-amber-500/40 bg-amber-500/5',
    badge: 'bg-amber-500/15 text-amber-600',
    accent: 'text-amber-600',
  },
  moderate: {
    label: 'Moderate',
    subtitle: 'Market-rate baseline',
    color: 'border-blue-500/40 bg-blue-500/5',
    badge: 'bg-blue-500/15 text-blue-600',
    accent: 'text-blue-600',
    highlight: true,
  },
  aggressive: {
    label: 'Aggressive',
    subtitle: 'Upside potential',
    color: 'border-green-500/40 bg-green-500/5',
    badge: 'bg-green-500/15 text-green-600',
    accent: 'text-green-600',
  },
} as const;

function fmt(n: number, opts?: { prefix?: string; suffix?: string; decimals?: number }) {
  const { prefix = '', suffix = '', decimals = 0 } = opts ?? {};
  const abs = Math.abs(n);
  const str = abs >= 1000 ? abs.toLocaleString('en-US', { maximumFractionDigits: decimals }) : abs.toFixed(decimals);
  return `${n < 0 ? '-' : ''}${prefix}${str}${suffix}`;
}

function cfColor(n: number) {
  if (n > 200) return 'text-green-600';
  if (n >= 0) return 'text-amber-600';
  return 'text-red-500';
}

function dealLabel(cocROI: number): { label: string; color: string } {
  if (cocROI >= 8) return { label: 'Excellent', color: 'bg-green-500/15 text-green-700' };
  if (cocROI >= 5) return { label: 'Good', color: 'bg-blue-500/15 text-blue-700' };
  if (cocROI >= 0) return { label: 'Marginal', color: 'bg-amber-500/15 text-amber-700' };
  return { label: 'Negative', color: 'bg-red-500/15 text-red-700' };
}

interface ScenarioCardProps {
  type: keyof typeof SCENARIO_CONFIG;
  metrics: ScenarioMetrics;
  onApply: () => void;
  applied: boolean;
}

function ScenarioCard({ type, metrics: m, onApply, applied }: ScenarioCardProps) {
  const cfg = SCENARIO_CONFIG[type];
  const deal = dealLabel(m.cocROI);

  return (
    <div className={cn('rounded-xl border-2 flex flex-col', cfg.color, cfg.highlight && 'ring-2 ring-blue-500/30')}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border/40">
        <div className="flex items-start justify-between">
          <div>
            <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', cfg.badge)}>{cfg.label}</span>
            <p className="text-[11px] text-muted-foreground mt-1">{cfg.subtitle}</p>
          </div>
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', deal.color)}>{deal.label}</span>
        </div>

        {/* Cash flow — prominent */}
        <div className="mt-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Monthly Cash Flow</p>
          <p className={cn('text-3xl font-bold mt-0.5', cfColor(m.monthlyCashFlow))}>
            {m.monthlyCashFlow >= 0 ? '+' : ''}{fmt(m.monthlyCashFlow, { prefix: '$' })}
          </p>
        </div>
      </div>

      {/* Key metrics */}
      <div className="px-4 py-3 space-y-2 flex-1">
        <MetricRow label="CoC ROI" value={fmt(m.cocROI, { suffix: '%', decimals: 1 })} highlight={m.cocROI >= 5} />
        <MetricRow label="Cap Rate" value={fmt(m.capRate, { suffix: '%', decimals: 1 })} highlight={m.capRate >= 5} />
        <MetricRow label="Total ROI (Yr 1)" value={fmt(m.totalROI, { suffix: '%', decimals: 1 })} highlight={m.totalROI >= 8} />
        <MetricRow label="Annual Cash Flow" value={fmt(m.annualCashFlow, { prefix: '$' })} />
        <MetricRow label="Monthly Mortgage" value={fmt(m.monthlyMortgage, { prefix: '$' })} />
        <MetricRow label="Cash Invested" value={fmt(m.cashInvested, { prefix: '$' })} />

        <div className="pt-1.5 border-t border-border/40">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Assumptions</p>
          <AsRow label="Purchase Price" value={`$${m.purchasePrice.toLocaleString()}`} />
          <AsRow label="Rent / Unit" value={`$${m.rentPerUnit.toLocaleString()}/mo`} />
          <AsRow label="Vacancy" value={`${m.vacancyRate}%`} />
          <AsRow label="Down Payment" value={`${m.downPaymentPercent}%`} />
          <AsRow label="Interest Rate" value={`${m.interestRate}%`} />
          <AsRow label="Appreciation" value={`${m.appreciationRate}%/yr`} />
        </div>

        <div className="pt-1.5 border-t border-border/40">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Long-Term Equity</p>
          <AsRow label="Property Value (5yr)" value={`$${Math.round(m.propValue5yr).toLocaleString()}`} />
          <AsRow label="Your Equity (5yr)" value={`$${Math.round(m.equity5yr).toLocaleString()}`} />
          <AsRow label="Property Value (10yr)" value={`$${Math.round(m.propValue10yr).toLocaleString()}`} />
          <AsRow label="Your Equity (10yr)" value={`$${Math.round(m.equity10yr).toLocaleString()}`} />
          <AsRow label="Cumulative CF (5yr)" value={`$${Math.round(m.cumCashFlow5yr).toLocaleString()}`} />
          <AsRow label="Cumulative CF (10yr)" value={`$${Math.round(m.cumCashFlow10yr).toLocaleString()}`} />
        </div>
      </div>

      {/* Apply button */}
      <div className="px-4 pb-4">
        <Button
          className="w-full"
          variant={applied ? 'outline' : type === 'moderate' ? 'default' : 'outline'}
          onClick={onApply}
          disabled={applied}
        >
          {applied
            ? <><CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> Applied</>
            : 'Apply to Calculator'}
        </Button>
      </div>
    </div>
  );
}

function MetricRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-xs font-bold', highlight ? 'text-green-600' : 'text-foreground')}>{value}</span>
    </div>
  );
}

function AsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-[10px] font-semibold text-foreground">{value}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AIDealAnalysis({ address, propertyData, updateField, onClose }: AIDealAnalysisProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [research, setResearch] = useState<MarketResearch | null>(null);
  const [webSearchUsed, setWebSearchUsed] = useState(false);
  const [applied, setApplied] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(AI_DEAL_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ address, propertyData }),
        });
        if (cancelled) return;
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setResearch(json.marketResearch ?? {});
        setWebSearchUsed(json.webSearchUsed ?? false);
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? 'Failed to generate deal analysis.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [address]);

  // Build 3 scenario inputs from market research
  const scenarios = research ? buildScenarios(propertyData, research) : null;

  function applyScenario(type: 'conservative' | 'moderate' | 'aggressive') {
    if (!scenarios) return;
    const s = scenarios[type];
    updateField('purchasePrice', Math.round(s.purchasePrice));
    updateField('rentPerUnit', Math.round(s.rentPerUnit));
    updateField('vacancyRate', s.vacancyRate);
    updateField('interestRate', s.interestRate);
    updateField('downPaymentPercent', s.downPaymentPercent);
    updateField('propertyTaxes', Math.round(s.propertyTaxes));
    updateField('insurance', Math.round(s.insurance));
    updateField('maintenanceCapex', Math.round(s.maintenanceCapex));
    updateField('propertyManagementFee', s.propertyManagementFee);
    updateField('appreciationRate', s.appreciationRate);
    setApplied(type);
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} scenario applied to calculator!`);
    setTimeout(onClose, 1200);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl mx-4 my-6 bg-card rounded-2xl border border-border shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border rounded-t-2xl">
          <div className="flex items-start justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">AI Deal Analysis</h2>
                <p className="text-xs text-muted-foreground truncate max-w-xs">{address}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 pb-6">
          {loading && <LoadingView />}

          {error && !loading && (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm text-destructive font-semibold">Analysis failed</p>
              <p className="text-xs text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={onClose} className="mt-4">Close</Button>
            </div>
          )}

          {research && scenarios && !loading && (
            <div className="space-y-5 pt-4">
              {/* Market summary bar */}
              <div className="rounded-xl border border-border bg-accent/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-4 h-4 text-primary" />
                  <p className="text-xs font-bold text-foreground">Live Market Research</p>
                  {webSearchUsed && (
                    <span className="text-[10px] bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded font-semibold">
                      Web Search
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <SummaryTile
                    label="Est. Market Value"
                    value={research.estimatedValue ? `$${research.estimatedValue.toLocaleString()}` : '—'}
                  />
                  <SummaryTile
                    label="Rent Range"
                    value={research.rentLow && research.rentHigh
                      ? `$${research.rentLow.toLocaleString()}–$${research.rentHigh.toLocaleString()}`
                      : '—'}
                  />
                  <SummaryTile
                    label="Market Condition"
                    value={research.marketCondition ?? '—'}
                    valueColor={
                      research.marketCondition === 'Hot' ? 'text-red-500' :
                      research.marketCondition === 'Cool' ? 'text-blue-500' : 'text-amber-500'
                    }
                    icon={
                      research.marketCondition === 'Hot' ? <TrendingUp className="w-3.5 h-3.5 text-red-500" /> :
                      research.marketCondition === 'Cool' ? <TrendingDown className="w-3.5 h-3.5 text-blue-500" /> :
                      <Minus className="w-3.5 h-3.5 text-amber-500" />
                    }
                  />
                  <SummaryTile
                    label="Area Cap Rate Avg"
                    value={research.avgAreaCapRate ? `${research.avgAreaCapRate.toFixed(1)}%` : '—'}
                  />
                </div>
                {research.notes && (
                  <div className="flex gap-2 bg-background/60 rounded-lg px-3 py-2">
                    <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{research.notes}</p>
                  </div>
                )}
              </div>

              {/* Scenario cards */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
                  Investment Scenarios
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ScenarioCard
                    type="conservative"
                    metrics={calcScenario(scenarios.conservative)}
                    onApply={() => applyScenario('conservative')}
                    applied={applied === 'conservative'}
                  />
                  <ScenarioCard
                    type="moderate"
                    metrics={calcScenario(scenarios.moderate)}
                    onApply={() => applyScenario('moderate')}
                    applied={applied === 'moderate'}
                  />
                  <ScenarioCard
                    type="aggressive"
                    metrics={calcScenario(scenarios.aggressive)}
                    onApply={() => applyScenario('aggressive')}
                    applied={applied === 'aggressive'}
                  />
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground text-center">
                All calculations use standard real estate formulas. Estimates are for informational purposes only — consult a financial advisor before investing.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

function SummaryTile({ label, value, valueColor, icon }: {
  label: string; value: string; valueColor?: string; icon?: React.ReactNode;
}) {
  return (
    <div className="bg-background/60 rounded-lg px-3 py-2.5">
      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{label}</p>
      <div className="flex items-center gap-1 mt-0.5">
        {icon}
        <p className={cn('text-sm font-bold text-foreground', valueColor)}>{value}</p>
      </div>
    </div>
  );
}

// ── Scenario builder ──────────────────────────────────────────────────────────

function buildScenarios(
  prop: PropertyData,
  r: MarketResearch
): { conservative: ScenarioInput; moderate: ScenarioInput; aggressive: ScenarioInput } {
  // Base values — prefer live market research over property data
  const basePrice = r.estimatedValue ?? prop.lastSalePrice ?? prop.assessedValue ?? 300000;
  const rentMedian = r.rentMedian ?? prop.medianRent ?? prop.aiEstimates?.rentPerUnit ?? 1500;
  const rentLow = r.rentLow ?? Math.round(rentMedian * 0.9);
  const rentHigh = r.rentHigh ?? Math.round(rentMedian * 1.12);
  const taxes = r.propertyTaxes ?? prop.propertyTaxes ?? prop.aiEstimates?.propertyTaxes ?? Math.round(basePrice * 0.012);
  const insurance = r.insurance ?? prop.aiEstimates?.insurance ?? Math.round(basePrice * 0.004);
  const maintenance = r.maintenanceCapex ?? prop.aiEstimates?.maintenanceCapex ?? Math.round(basePrice * 0.01);

  const conservative: ScenarioInput = {
    purchasePrice: Math.round(basePrice * 1.01),  // paying slightly over
    rentPerUnit: rentLow,
    vacancyRate: 10,
    interestRate: 7.25,
    downPaymentPercent: 25,
    propertyTaxes: Math.round(taxes * 1.05),
    insurance: Math.round(insurance * 1.1),
    maintenanceCapex: Math.round(maintenance * 1.2),
    propertyManagementFee: 10,
    appreciationRate: 2,
    annualRentIncrease: 1,
  };

  const moderate: ScenarioInput = {
    purchasePrice: basePrice,
    rentPerUnit: rentMedian,
    vacancyRate: 7,
    interestRate: 6.89,
    downPaymentPercent: 20,
    propertyTaxes: taxes,
    insurance,
    maintenanceCapex: maintenance,
    propertyManagementFee: 8,
    appreciationRate: 3,
    annualRentIncrease: 2,
  };

  const aggressive: ScenarioInput = {
    purchasePrice: Math.round(basePrice * 0.95),  // buying below market
    rentPerUnit: rentHigh,
    vacancyRate: 4,
    interestRate: 6.5,
    downPaymentPercent: 20,
    propertyTaxes: Math.round(taxes * 0.97),
    insurance: Math.round(insurance * 0.95),
    maintenanceCapex: Math.round(maintenance * 0.9),
    propertyManagementFee: 8,
    appreciationRate: 4,
    annualRentIncrease: 3,
  };

  return { conservative, moderate, aggressive };
}
