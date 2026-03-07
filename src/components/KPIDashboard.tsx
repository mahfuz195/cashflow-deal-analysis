import { CalculatorOutputs } from '@/types/calculator';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { AffiliateLinks } from './AffiliateLinks';

interface KPIDashboardProps {
  outputs: CalculatorOutputs;
  isDIY: boolean;
  onToggleDIY: (val: boolean) => void;
}

function formatCurrency(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1e6) return (val < 0 ? '-' : '') + '$' + (abs / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return (val < 0 ? '-' : '') + '$' + (abs / 1e3).toFixed(abs >= 1e4 ? 0 : 1) + 'K';
  return '$' + val.toFixed(0);
}

const kpis = [
  { key: 'monthlyCashFlow', label: 'Monthly Cash Flow', format: (v: number) => (v < 0 ? '-' : '') + '$' + Math.abs(v).toFixed(0) },
  { key: 'cashOnCashROI', label: 'CoC ROI', format: (v: number) => v.toFixed(2) + '%' },
  { key: 'capRate', label: 'Cap Rate', format: (v: number) => v.toFixed(2) + '%' },
  { key: 'monthlyMortgage', label: 'Mortgage', format: (v: number) => '$' + v.toFixed(0) },
  { key: 'totalROI', label: 'Total ROI', format: (v: number) => v.toFixed(2) + '%' },
  { key: 'annualCashFlow', label: 'Annual Cash Flow', format: (v: number) => (v < 0 ? '-' : '') + '$' + Math.abs(v).toFixed(0) },
] as const;

export function KPIDashboard({ outputs, isDIY, onToggleDIY }: KPIDashboardProps) {
  const ratingColors: Record<string, string> = {
    success: 'bg-success text-success-foreground',
    warning: 'bg-warning text-warning-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
  };

  return (
    <div className="space-y-4">
      {/* Deal Rating + DIY Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={cn("px-3 py-1.5 rounded-md text-sm font-bold", ratingColors[outputs.dealRatingColor])}>
            {outputs.dealRating}
          </span>
          <span className="text-sm text-muted-foreground font-medium">Deal Rating</span>
          <AffiliateLinks />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">DIY Management</span>
          <Switch checked={isDIY} onCheckedChange={onToggleDIY} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(kpi => {
          const val = outputs[kpi.key] as number;
          const isNeg = val < 0;
          return (
            <div key={kpi.key} className="bg-card rounded-lg border border-border p-3 space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
              <p className={cn("text-lg font-bold", isNeg ? "text-destructive" : "text-foreground")}>
                {kpi.format(val)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
