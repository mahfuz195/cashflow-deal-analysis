import { useEffect, useState } from 'react';
import {
  X, Globe, TrendingUp, TrendingDown, Minus,
  CheckCircle2, Loader2, Sparkles, Info,
  Search, DollarSign, BarChart3, Zap, ArrowRight,
} from 'lucide-react';
import { CalculatorState } from '@/types/calculator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const AI_DEAL_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-deal-analysis`;

// ── Calculation helpers ────────────────────────────────────────────────────────

function safeNum(v: number) { return isFinite(v) && !isNaN(v) ? v : 0; }

function pmtCalc(annualRate: number, years: number, principal: number) {
  if (annualRate === 0) return principal / (years * 12);
  const r = annualRate / 100 / 12;
  const n = years * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function calcScenario(p: ScenarioInput): ScenarioMetrics {
  const {
    purchasePrice, rentPerUnit, numberOfUnits = 1,
    vacancyRate, interestRate, loanTerm = 30,
    downPaymentPercent, propertyTaxes, insurance,
    maintenanceCapex, propertyManagementFee,
    appreciationRate, annualRentIncrease = 2,
    closingCostPercent = 3,
  } = p;

  const downPayment  = purchasePrice * (downPaymentPercent / 100);
  const loanAmount   = purchasePrice - downPayment;
  const cashInvested = downPayment + purchasePrice * (closingCostPercent / 100);
  const grossRentalIncome    = rentPerUnit * numberOfUnits * 12;
  const effectiveGrossIncome = grossRentalIncome * (1 - vacancyRate / 100);
  const pmFee                = effectiveGrossIncome * (propertyManagementFee / 100);
  const totalOpEx            = propertyTaxes + insurance + maintenanceCapex + pmFee;
  const noi                  = effectiveGrossIncome - totalOpEx;
  const monthlyMortgage      = loanAmount > 0 ? pmtCalc(interestRate, loanTerm, loanAmount) : 0;
  const annualDebtService    = monthlyMortgage * 12;
  const annualCashFlow       = noi - annualDebtService;
  const monthlyCashFlow      = annualCashFlow / 12;
  const cocROI  = safeNum(cashInvested > 0 ? (annualCashFlow / cashInvested) * 100 : 0);
  const capRate = safeNum(purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0);

  let balance = loanAmount, principalPaid = 0;
  const mr = interestRate / 100 / 12;
  for (let i = 0; i < 12; i++) {
    const int = balance * mr;
    const prin = monthlyMortgage - int;
    principalPaid += prin; balance -= prin;
  }
  const totalROI = safeNum(cashInvested > 0 ? ((annualCashFlow + principalPaid) / cashInvested) * 100 : 0);

  function equityAtYear(year: number) {
    let bal = loanAmount;
    const mRate = interestRate / 100 / 12;
    for (let m = 0; m < year * 12; m++) {
      const int = bal * mRate;
      bal = Math.max(0, bal - (monthlyMortgage - int));
    }
    const propValue = purchasePrice * Math.pow(1 + appreciationRate / 100, year);
    return { equity: propValue - bal, propValue, remainingDebt: bal };
  }

  let cumCF5 = 0, cumCF10 = 0, projEGI = effectiveGrossIncome;
  for (let y = 1; y <= 10; y++) {
    if (y > 1) projEGI *= 1 + annualRentIncrease / 100;
    const yPM  = projEGI * (propertyManagementFee / 100);
    const yCF  = projEGI - (totalOpEx - pmFee + yPM) - annualDebtService;
    if (y <= 5) cumCF5 += yCF;
    cumCF10 += yCF;
  }

  const eq5 = equityAtYear(5), eq10 = equityAtYear(10);

  return {
    purchasePrice, downPayment, loanAmount, cashInvested,
    monthlyMortgage, monthlyCashFlow, annualCashFlow,
    cocROI, capRate, totalROI, noi,
    grossRentalIncome, effectiveGrossIncome,
    totalOperatingExpenses: totalOpEx,
    equity5yr: eq5.equity,   propValue5yr: eq5.propValue,
    equity10yr: eq10.equity, propValue10yr: eq10.propValue,
    cumCashFlow5yr: cumCF5,  cumCashFlow10yr: cumCF10,
    rentPerUnit, vacancyRate, interestRate,
    downPaymentPercent, propertyTaxes, insurance,
    maintenanceCapex, propertyManagementFee, appreciationRate,
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScenarioInput {
  purchasePrice: number; rentPerUnit: number; numberOfUnits?: number;
  vacancyRate: number; interestRate: number; loanTerm?: number;
  downPaymentPercent: number; propertyTaxes: number; insurance: number;
  maintenanceCapex: number; propertyManagementFee: number;
  appreciationRate: number; annualRentIncrease?: number; closingCostPercent?: number;
}
interface ScenarioMetrics {
  purchasePrice: number; downPayment: number; loanAmount: number; cashInvested: number;
  monthlyMortgage: number; monthlyCashFlow: number; annualCashFlow: number;
  cocROI: number; capRate: number; totalROI: number; noi: number;
  grossRentalIncome: number; effectiveGrossIncome: number; totalOperatingExpenses: number;
  equity5yr: number; propValue5yr: number; equity10yr: number; propValue10yr: number;
  cumCashFlow5yr: number; cumCashFlow10yr: number;
  rentPerUnit: number; vacancyRate: number; interestRate: number;
  downPaymentPercent: number; propertyTaxes: number; insurance: number;
  maintenanceCapex: number; propertyManagementFee: number; appreciationRate: number;
}
interface MarketResearch {
  estimatedValue?: number; rentLow?: number; rentMedian?: number; rentHigh?: number;
  propertyTaxes?: number; insurance?: number; maintenanceCapex?: number;
  marketCondition?: 'Hot' | 'Balanced' | 'Cool';
  avgAreaCapRate?: number; rentTrend?: number; notes?: string;
}
interface PropertyData {
  address: string; bedrooms?: number; bathrooms?: number;
  squareFootage?: number; yearBuilt?: number; propertyType?: string;
  lastSalePrice?: number; assessedValue?: number; propertyTaxes?: number;
  medianRent?: number; rentalCount?: number; aiEstimates?: Record<string, number>;
}
interface AIDealAnalysisProps {
  address: string; propertyData: PropertyData;
  updateField: <K extends keyof CalculatorState>(field: K, value: CalculatorState[K]) => void;
  onClose: () => void;
}

// ── Scenario config — order: Aggressive, Moderate, Conservative ───────────────

const SCENARIO_ORDER = ['aggressive', 'moderate', 'conservative'] as const;
type ScenarioType = typeof SCENARIO_ORDER[number];

const SCENARIO_CFG: Record<ScenarioType, {
  emoji: string; label: string; subtitle: string;
  headerGrad: string; border: string; featuredRing?: string;
  badgeBg: string; badgeText: string; cfPositive: string; featured?: boolean;
}> = {
  aggressive: {
    emoji: '🚀',
    label: 'Aggressive',
    subtitle: 'Maximum upside — optimistic assumptions',
    headerGrad: 'linear-gradient(135deg, hsl(158 65% 35%) 0%, hsl(165 60% 28%) 100%)',
    border: 'border-emerald-500/45',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-600 dark:text-emerald-400',
    cfPositive: 'text-emerald-400',
  },
  moderate: {
    emoji: '⚡',
    label: 'Moderate',
    subtitle: 'Market-rate baseline — realistic assumptions',
    headerGrad: 'linear-gradient(135deg, hsl(263 80% 50%) 0%, hsl(245 78% 44%) 100%)',
    border: 'border-violet-500/45',
    featuredRing: 'ring-2 ring-violet-500/30',
    badgeBg: 'bg-violet-500/15',
    badgeText: 'text-violet-600 dark:text-violet-400',
    cfPositive: 'text-violet-300',
    featured: true,
  },
  conservative: {
    emoji: '🛡️',
    label: 'Conservative',
    subtitle: 'Worst-case protection — stress-tested',
    headerGrad: 'linear-gradient(135deg, hsl(38 88% 44%) 0%, hsl(30 85% 36%) 100%)',
    border: 'border-amber-500/45',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-600 dark:text-amber-400',
    cfPositive: 'text-amber-300',
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number, opts?: { prefix?: string; suffix?: string; decimals?: number }) {
  const { prefix = '', suffix = '', decimals = 0 } = opts ?? {};
  const abs = Math.abs(n);
  const str = abs >= 1_000_000
    ? (abs / 1_000_000).toFixed(1) + 'M'
    : abs >= 1000
      ? abs.toLocaleString('en-US', { maximumFractionDigits: decimals })
      : abs.toFixed(decimals);
  return `${n < 0 ? '-' : ''}${prefix}${str}${suffix}`;
}

function dealLabel(cocROI: number): { label: string; bg: string; text: string } {
  if (cocROI >= 8) return { label: 'Excellent', bg: 'bg-emerald-500/20', text: 'text-emerald-300' };
  if (cocROI >= 5) return { label: 'Good',      bg: 'bg-blue-500/20',    text: 'text-blue-300' };
  if (cocROI >= 0) return { label: 'Marginal',  bg: 'bg-amber-500/20',   text: 'text-amber-300' };
  return              { label: 'Negative',  bg: 'bg-red-500/20',     text: 'text-red-300' };
}

// ── Loading screen ─────────────────────────────────────────────────────────────

const LOAD_STEPS = [
  { label: 'Searching comparable sales in the area',    icon: Search },
  { label: 'Analyzing rental market rates',              icon: TrendingUp },
  { label: 'Researching property taxes & expenses',      icon: DollarSign },
  { label: 'Building 3 investment scenarios',            icon: BarChart3 },
];

function LoadingScreen() {
  const [done, setDone] = useState<Set<number>>(new Set());
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timers = LOAD_STEPS.map((_, i) =>
      setTimeout(() => {
        setDone(prev => new Set([...prev, i]));
        setActive(Math.min(i + 1, LOAD_STEPS.length - 1));
      }, (i + 1) * 4200)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const progress = done.size / LOAD_STEPS.length;

  return (
    <div className="hero-bg flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-16 relative overflow-hidden">
      {/* Dot grid */}
      <div className="dot-grid absolute inset-0 opacity-30 pointer-events-none" />

      {/* Orbiting spinner icon */}
      <div className="relative mb-10">
        {/* Outer pulsing ring */}
        <div className="absolute -inset-6 rounded-full border-2 border-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
        {/* Spinning gradient ring */}
        <div className="w-24 h-24 rounded-full p-[3px]"
          style={{ background: 'conic-gradient(from 0deg, hsl(263 80% 58%), hsl(245 78% 58%), hsl(263 80% 58% / 0.1), hsl(263 80% 58%))' }}>
          <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
            <Sparkles className="w-9 h-9 text-primary animate-pulse" />
          </div>
        </div>
        {/* Spinning dot */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2s' }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1.5 w-3 h-3 rounded-full bg-primary shadow-[0_0_8px_hsl(263_80%_58%/0.8)]" />
        </div>
      </div>

      {/* Title */}
      <h2 className="text-2xl md:text-3xl font-black text-foreground mb-2 text-center">
        Analyzing Your Deal
      </h2>
      <p className="text-muted-foreground text-sm mb-10 text-center max-w-xs">
        Our AI is searching live market data to build your investment analysis
      </p>

      {/* Step list */}
      <div className="w-full max-w-sm space-y-2.5 mb-8">
        {LOAD_STEPS.map((step, i) => {
          const isDone   = done.has(i);
          const isActive = active === i && !isDone;
          const Icon = step.icon;
          return (
            <div
              key={i}
              className={cn(
                'flex items-center gap-3.5 px-4 py-3 rounded-2xl border transition-all duration-500',
                isDone   ? 'bg-success/8 border-success/30' :
                isActive ? 'bg-primary/8 border-primary/25 shadow-sm' :
                           'bg-muted/20 border-border/30 opacity-40',
              )}
            >
              {/* Icon circle */}
              <div className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all',
                isDone   ? 'bg-success text-white' :
                isActive ? 'text-white' : 'bg-muted text-muted-foreground',
              )}
                style={isActive ? { background: 'linear-gradient(135deg, hsl(263 80% 58%), hsl(245 78% 58%))' } : undefined}
              >
                {isDone   ? <CheckCircle2 className="w-4 h-4" /> :
                 isActive ? <Loader2 className="w-4 h-4 animate-spin" /> :
                            <Icon className="w-4 h-4" />}
              </div>
              <span className={cn(
                'text-sm font-medium transition-colors',
                isDone   ? 'text-success line-through opacity-70' :
                isActive ? 'text-foreground' : 'text-muted-foreground',
              )}>
                {step.label}{isActive ? '…' : ''}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-sm h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.max(progress * 100, 8)}%`,
            background: 'linear-gradient(90deg, hsl(263 80% 58%), hsl(245 78% 58%))',
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2.5">Using live web data for accuracy</p>
    </div>
  );
}

// ── Scenario Card ──────────────────────────────────────────────────────────────

interface ScenarioCardProps {
  type: ScenarioType;
  metrics: ScenarioMetrics;
  onApply: () => void;
  applied: boolean;
}

function ScenarioCard({ type, metrics: m, onApply, applied }: ScenarioCardProps) {
  const cfg = SCENARIO_CFG[type];
  const deal = dealLabel(m.cocROI);
  const isPos = m.monthlyCashFlow >= 0;

  return (
    <div className={cn(
      'rounded-2xl border overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-1',
      cfg.border,
      cfg.featured && cfg.featuredRing,
    )}>
      {/* ── Gradient header ── */}
      <div className="px-5 pt-5 pb-6 relative overflow-hidden" style={{ background: cfg.headerGrad }}>
        {/* Subtle dot texture in header */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />

        <div className="relative">
          {/* Badge row */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{cfg.emoji}</span>
              <div>
                <p className="font-black text-white text-lg leading-tight">{cfg.label}</p>
                <p className="text-white/65 text-[11px] mt-0.5">{cfg.subtitle}</p>
              </div>
            </div>
            <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full', deal.bg, deal.text)}>
              {deal.label}
            </span>
          </div>

          {/* Monthly Cash Flow — hero number */}
          <div>
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Monthly Cash Flow</p>
            <p className={cn(
              'text-5xl font-black leading-none tracking-tight',
              isPos ? cfg.cfPositive : 'text-red-300'
            )}>
              {m.monthlyCashFlow >= 0 ? '+' : ''}
              {fmt(m.monthlyCashFlow, { prefix: '$' })}
            </p>
            <p className="text-white/50 text-xs mt-1.5">After all expenses & mortgage</p>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-3 gap-2 mt-5">
            {[
              { l: 'CoC ROI',  v: fmt(m.cocROI,   { suffix: '%', decimals: 1 }) },
              { l: 'Cap Rate', v: fmt(m.capRate,   { suffix: '%', decimals: 1 }) },
              { l: 'Total ROI',v: fmt(m.totalROI,  { suffix: '%', decimals: 1 }) },
            ].map(({ l, v }) => (
              <div key={l} className="bg-black/20 rounded-xl px-2 py-2 text-center">
                <p className="text-[9px] text-white/55 font-semibold uppercase tracking-wider">{l}</p>
                <p className="text-sm font-black text-white mt-0.5">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col flex-1 bg-card">
        {/* Key metrics */}
        <div className="px-5 py-4 space-y-0">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5">Cash Flow Detail</p>
          {[
            { label: 'Annual Cash Flow',  val: fmt(m.annualCashFlow, { prefix: '$' }),          pos: m.annualCashFlow >= 0 },
            { label: 'Monthly Mortgage', val: fmt(m.monthlyMortgage, { prefix: '$' }),          pos: null },
            { label: 'Net Op. Income',   val: fmt(m.noi,             { prefix: '$' }),          pos: m.noi >= 0 },
            { label: 'Cash Invested',    val: fmt(m.cashInvested,    { prefix: '$' }),          pos: null },
          ].map(({ label, val, pos }) => (
            <div key={label} className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className={cn('text-xs font-bold tabular-nums',
                pos === true ? 'text-success' : pos === false ? 'text-destructive' : 'text-foreground'
              )}>{val}</span>
            </div>
          ))}
        </div>

        {/* Assumptions */}
        <div className="px-5 py-4 border-t border-border/50">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5">Assumptions</p>
          <div className="grid grid-cols-2 gap-x-4">
            {[
              { l: 'Purchase Price', v: `$${m.purchasePrice.toLocaleString()}` },
              { l: 'Rent / Unit',    v: `$${m.rentPerUnit.toLocaleString()}/mo` },
              { l: 'Vacancy',        v: `${m.vacancyRate}%` },
              { l: 'Interest Rate',  v: `${m.interestRate}%` },
              { l: 'Down Payment',   v: `${m.downPaymentPercent}%` },
              { l: 'Appreciation',   v: `${m.appreciationRate}%/yr` },
            ].map(({ l, v }) => (
              <div key={l} className="flex flex-col py-1 border-b border-border/30 last:border-0">
                <span className="text-[9px] text-muted-foreground uppercase tracking-wide font-semibold">{l}</span>
                <span className="text-xs font-bold text-foreground">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Long-term equity */}
        <div className="px-5 py-4 border-t border-border/50">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5">Long-Term Projections</p>
          <div className="space-y-0">
            {[
              { label: 'Property Value (5 yr)', val: `$${Math.round(m.propValue5yr).toLocaleString()}` },
              { label: 'Your Equity (5 yr)',    val: `$${Math.round(m.equity5yr).toLocaleString()}` },
              { label: 'Cumul. Cash Flow (5 yr)',val: fmt(m.cumCashFlow5yr, { prefix: '$' }) },
              { label: 'Property Value (10 yr)', val: `$${Math.round(m.propValue10yr).toLocaleString()}` },
              { label: 'Your Equity (10 yr)',    val: `$${Math.round(m.equity10yr).toLocaleString()}` },
              { label: 'Cumul. Cash Flow (10 yr)',val: fmt(m.cumCashFlow10yr, { prefix: '$' }) },
            ].map(({ label, val }) => (
              <div key={label} className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-0">
                <span className="text-[10px] text-muted-foreground">{label}</span>
                <span className="text-[10px] font-bold text-foreground tabular-nums">{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Apply button */}
        <div className="px-5 pb-5 pt-2">
          <button
            onClick={onApply}
            disabled={applied}
            className={cn(
              'w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all',
              applied
                ? 'bg-success/15 text-success border border-success/30 cursor-not-allowed'
                : 'text-white hover:opacity-90 hover:shadow-lg active:scale-[0.98]',
            )}
            style={!applied ? { background: cfg.headerGrad } : undefined}
          >
            {applied
              ? <><CheckCircle2 className="w-4 h-4" /> Applied to Calculator</>
              : <><ArrowRight className="w-4 h-4" /> Apply to Calculator</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Market Research summary bar ────────────────────────────────────────────────

function MarketBar({ r, webSearchUsed }: { r: MarketResearch; webSearchUsed: boolean }) {
  const condIcon = r.marketCondition === 'Hot'
    ? <TrendingUp className="w-4 h-4 text-red-400" />
    : r.marketCondition === 'Cool'
      ? <TrendingDown className="w-4 h-4 text-blue-400" />
      : <Minus className="w-4 h-4 text-amber-400" />;
  const condColor = r.marketCondition === 'Hot' ? 'text-red-400' : r.marketCondition === 'Cool' ? 'text-blue-400' : 'text-amber-400';

  return (
    <div className="rounded-2xl border border-border/70 bg-muted/30 overflow-hidden">
      {/* Title row */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border/50">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, hsl(263 80% 58%), hsl(245 78% 58%))' }}>
          <Globe className="w-3.5 h-3.5 text-white" />
        </div>
        <p className="text-sm font-bold text-foreground">Live Market Research</p>
        {webSearchUsed && (
          <span className="ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/15 text-success">
            Web Search ✓
          </span>
        )}
      </div>

      {/* Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/40">
        {[
          {
            label: 'Est. Market Value',
            value: r.estimatedValue ? `$${r.estimatedValue.toLocaleString()}` : '—',
            sub: 'Current market',
          },
          {
            label: 'Rental Range',
            value: r.rentLow && r.rentHigh ? `$${r.rentLow.toLocaleString()}–$${r.rentHigh.toLocaleString()}` : '—',
            sub: 'Monthly rent',
          },
          {
            label: 'Market Condition',
            value: r.marketCondition ?? '—',
            sub: 'Supply & demand',
            icon: condIcon,
            valueClass: condColor,
          },
          {
            label: 'Area Cap Rate Avg',
            value: r.avgAreaCapRate ? `${r.avgAreaCapRate.toFixed(1)}%` : '—',
            sub: 'Local benchmark',
          },
        ].map(({ label, value, sub, icon, valueClass }) => (
          <div key={label} className="bg-background/50 px-4 py-3.5">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-1">{label}</p>
            <div className="flex items-center gap-1.5">
              {icon}
              <p className={cn('text-base font-black text-foreground', valueClass)}>{value}</p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* AI notes */}
      {r.notes && (
        <div className="flex gap-2.5 px-5 py-3.5 border-t border-border/50 bg-primary/3">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">{r.notes}</p>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AIDealAnalysis({ address, propertyData, updateField, onClose }: AIDealAnalysisProps) {
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [research,       setResearch]       = useState<MarketResearch | null>(null);
  const [webSearchUsed,  setWebSearchUsed]  = useState(false);
  const [applied,        setApplied]        = useState<string | null>(null);

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

  const scenarios = research ? buildScenarios(propertyData, research) : null;

  function applyScenario(type: ScenarioType) {
    if (!scenarios) return;
    const s = scenarios[type];
    updateField('purchasePrice',       Math.round(s.purchasePrice));
    updateField('rentPerUnit',         Math.round(s.rentPerUnit));
    updateField('vacancyRate',         s.vacancyRate);
    updateField('interestRate',        s.interestRate);
    updateField('downPaymentPercent',  s.downPaymentPercent);
    updateField('propertyTaxes',       Math.round(s.propertyTaxes));
    updateField('insurance',           Math.round(s.insurance));
    updateField('maintenanceCapex',    Math.round(s.maintenanceCapex));
    updateField('propertyManagementFee', s.propertyManagementFee);
    updateField('appreciationRate',    s.appreciationRate);
    setApplied(type);
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} scenario applied!`);
    setTimeout(onClose, 1400);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background overflow-hidden">

      {/* ── Sticky Header ── */}
      <header className="shrink-0 border-b border-border/60 bg-background/90 backdrop-blur-xl z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 animate-pulse-glow"
              style={{ background: 'linear-gradient(135deg, hsl(263 80% 58%), hsl(245 78% 58%))' }}>
              <Zap className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-black text-foreground leading-tight">AI Deal Analysis</p>
              <p className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-xs md:max-w-md">{address}</p>
            </div>
          </div>

          {/* Status pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold"
            style={loading
              ? { background: 'hsl(263 80% 58% / 0.08)', borderColor: 'hsl(263 80% 58% / 0.25)', color: 'hsl(263 80% 52%)' }
              : { background: 'hsl(158 65% 40% / 0.08)', borderColor: 'hsl(158 65% 40% / 0.25)', color: 'hsl(158 65% 40%)' }
            }>
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
            {loading ? 'Analyzing…' : 'Analysis Complete'}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Loading */}
        {loading && <LoadingScreen />}

        {/* Error */}
        {error && !loading && (
          <div className="hero-bg flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <X className="w-8 h-8 text-destructive" />
            </div>
            <p className="text-lg font-black text-foreground">Analysis Failed</p>
            <p className="text-sm text-muted-foreground max-w-xs">{error}</p>
            <button
              onClick={onClose}
              className="mt-2 px-5 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-accent transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {/* Results */}
        {research && scenarios && !loading && (
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">

            {/* Market research bar */}
            <MarketBar r={research} webSearchUsed={webSearchUsed} />

            {/* Scenarios section */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div>
                  <h2 className="text-xl font-black text-foreground">Investment Scenarios</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Three views of this deal — from best case to worst case
                  </p>
                </div>
              </div>

              {/* Aggressive → Moderate → Conservative */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {SCENARIO_ORDER.map(type => (
                  <ScenarioCard
                    key={type}
                    type={type}
                    metrics={calcScenario(scenarios[type])}
                    onApply={() => applyScenario(type)}
                    applied={applied === type}
                  />
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="flex gap-2.5 bg-muted/40 rounded-2xl px-5 py-4 border border-border/50">
              <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                All calculations use standard real estate formulas. Estimates are generated using AI and live market data, and are for informational purposes only. Consult a licensed real estate agent, appraiser, and financial advisor before making any investment decisions.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Scenario builder ───────────────────────────────────────────────────────────

function buildScenarios(prop: PropertyData, r: MarketResearch) {
  const basePrice  = r.estimatedValue ?? prop.lastSalePrice ?? prop.assessedValue ?? 300_000;
  const rentMedian = r.rentMedian ?? prop.medianRent ?? prop.aiEstimates?.rentPerUnit ?? 1_500;
  const rentLow    = r.rentLow  ?? Math.round(rentMedian * 0.9);
  const rentHigh   = r.rentHigh ?? Math.round(rentMedian * 1.12);
  const taxes      = r.propertyTaxes   ?? prop.propertyTaxes ?? prop.aiEstimates?.propertyTaxes    ?? Math.round(basePrice * 0.012);
  const insurance  = r.insurance       ?? prop.aiEstimates?.insurance          ?? Math.round(basePrice * 0.004);
  const maint      = r.maintenanceCapex ?? prop.aiEstimates?.maintenanceCapex  ?? Math.round(basePrice * 0.01);

  const aggressive: ScenarioInput = {
    purchasePrice:       Math.round(basePrice * 0.95),
    rentPerUnit:         rentHigh,
    vacancyRate:         4,
    interestRate:        6.5,
    downPaymentPercent:  20,
    propertyTaxes:       Math.round(taxes * 0.97),
    insurance:           Math.round(insurance * 0.95),
    maintenanceCapex:    Math.round(maint * 0.9),
    propertyManagementFee: 8,
    appreciationRate:    4,
    annualRentIncrease:  3,
  };

  const moderate: ScenarioInput = {
    purchasePrice:       basePrice,
    rentPerUnit:         rentMedian,
    vacancyRate:         7,
    interestRate:        6.89,
    downPaymentPercent:  20,
    propertyTaxes:       taxes,
    insurance,
    maintenanceCapex:    maint,
    propertyManagementFee: 8,
    appreciationRate:    3,
    annualRentIncrease:  2,
  };

  const conservative: ScenarioInput = {
    purchasePrice:       Math.round(basePrice * 1.01),
    rentPerUnit:         rentLow,
    vacancyRate:         10,
    interestRate:        7.25,
    downPaymentPercent:  25,
    propertyTaxes:       Math.round(taxes * 1.05),
    insurance:           Math.round(insurance * 1.1),
    maintenanceCapex:    Math.round(maint * 1.2),
    propertyManagementFee: 10,
    appreciationRate:    2,
    annualRentIncrease:  1,
  };

  return { aggressive, moderate, conservative };
}
