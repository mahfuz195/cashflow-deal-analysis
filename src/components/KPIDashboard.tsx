import { CalculatorOutputs } from '@/types/calculator';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { AffiliateLinks } from './AffiliateLinks';
import { TrendingUp, TrendingDown, Minus, Trophy, AlertTriangle, XCircle } from 'lucide-react';

interface KPIDashboardProps {
  outputs: CalculatorOutputs;
  isDIY: boolean;
  onToggleDIY: (val: boolean) => void;
}

const kpis = [
  {
    key: 'monthlyCashFlow' as const,
    label: 'Monthly Cash Flow',
    format: (v: number) => (v < 0 ? '-$' : '$') + Math.abs(v).toFixed(0),
    featured: true,
  },
  {
    key: 'cashOnCashROI' as const,
    label: 'CoC Return',
    format: (v: number) => v.toFixed(2) + '%',
  },
  {
    key: 'capRate' as const,
    label: 'Cap Rate',
    format: (v: number) => v.toFixed(2) + '%',
  },
  {
    key: 'monthlyMortgage' as const,
    label: 'Mortgage / mo',
    format: (v: number) => '$' + v.toFixed(0),
  },
  {
    key: 'totalROI' as const,
    label: 'Total ROI',
    format: (v: number) => v.toFixed(2) + '%',
  },
  {
    key: 'annualCashFlow' as const,
    label: 'Annual Cash Flow',
    format: (v: number) => (v < 0 ? '-$' : '$') + Math.abs(v).toFixed(0),
  },
] as const;

const ratingConfig: Record<string, {
  bg: string; border: string; text: string; label: string;
  icon: React.ElementType; glow: string;
}> = {
  success: {
    bg:     'bg-emerald-500/10 dark:bg-emerald-500/15',
    border: 'border-emerald-500/40',
    text:   'text-emerald-600 dark:text-emerald-400',
    label:  'Excellent Deal',
    icon:   Trophy,
    glow:   '0 0 20px hsl(158 65% 42% / 0.28)',
  },
  warning: {
    bg:     'bg-amber-500/10 dark:bg-amber-500/15',
    border: 'border-amber-500/40',
    text:   'text-amber-600 dark:text-amber-400',
    label:  'Marginal Deal',
    icon:   AlertTriangle,
    glow:   '',
  },
  destructive: {
    bg:     'bg-red-500/10 dark:bg-red-500/15',
    border: 'border-red-500/40',
    text:   'text-red-600 dark:text-red-400',
    label:  'Negative Deal',
    icon:   XCircle,
    glow:   '',
  },
};

export function KPIDashboard({ outputs, isDIY, onToggleDIY }: KPIDashboardProps) {
  const rc = ratingConfig[outputs.dealRatingColor] ?? ratingConfig.warning;
  const RatingIcon = rc.icon;

  return (
    <div className="space-y-4">

      {/* ── Header: Deal Rating + DIY Toggle ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Rating badge */}
          <div
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold transition-all',
              rc.bg, rc.border, rc.text
            )}
            style={rc.glow ? { boxShadow: rc.glow } : undefined}
          >
            <RatingIcon className="w-4 h-4" />
            {outputs.dealRating}
          </div>
          <span className="text-sm text-muted-foreground hidden sm:block">Deal Rating</span>
          <AffiliateLinks />
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-sm font-medium text-muted-foreground">DIY Mode</span>
          <Switch checked={isDIY} onCheckedChange={onToggleDIY} />
        </div>
      </div>

      {/* ── KPI Cards Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(kpi => {
          const val = outputs[kpi.key] as number;
          const isNeg = val < 0;
          const isFeatured = kpi.featured;

          // Trend indicator
          const TrendIcon = isNeg ? TrendingDown : val === 0 ? Minus : TrendingUp;
          const trendColor = isNeg ? 'text-destructive' : 'text-success';

          return (
            <div
              key={kpi.key}
              className={cn(
                'rounded-2xl border p-4 flex flex-col gap-2 transition-all duration-200 hover:-translate-y-0.5',
                isFeatured
                  ? 'row-span-1 card-shadow'
                  : 'bg-card card-shadow border-border/70 hover:border-border',
              )}
              style={isFeatured ? {
                background: isNeg
                  ? 'linear-gradient(145deg, hsl(0 82% 60% / 0.06), hsl(var(--card)))'
                  : 'linear-gradient(145deg, hsl(263 80% 58% / 0.07), hsl(var(--card)))',
                borderColor: isNeg
                  ? 'hsl(0 82% 60% / 0.35)'
                  : 'hsl(263 80% 58% / 0.35)',
                boxShadow: isNeg
                  ? '0 4px 20px hsl(0 82% 60% / 0.12)'
                  : '0 4px 20px hsl(263 80% 58% / 0.12)',
              } : undefined}
            >
              {/* Label + trend icon */}
              <div className="flex items-center justify-between gap-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                  {kpi.label}
                </p>
                <TrendIcon className={cn('w-3.5 h-3.5 shrink-0', isFeatured ? trendColor : 'text-muted-foreground/50')} />
              </div>

              {/* Value */}
              <p
                className={cn(
                  'font-extrabold leading-none tabular-nums',
                  isFeatured ? 'text-2xl' : 'text-xl',
                  isNeg
                    ? 'text-destructive'
                    : isFeatured
                      ? 'text-primary'
                      : 'text-foreground'
                )}
              >
                {kpi.format(val)}
              </p>

              {/* Featured card — subtitle */}
              {isFeatured && (
                <p className="text-[10px] text-muted-foreground leading-none">
                  {isNeg ? 'Negative cash flow' : 'After all expenses'}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
