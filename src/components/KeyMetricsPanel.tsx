import { CalculatorOutputs } from '@/types/calculator';
import { cn } from '@/lib/utils';

interface KeyMetricsPanelProps {
  outputs: CalculatorOutputs;
}

const groups = [
  {
    title: 'Income',
    metrics: [
      { label: 'Gross Rental Income',    key: 'grossRentalIncome'      as const },
      { label: 'Effective Gross Income', key: 'effectiveGrossIncome'   as const },
    ],
  },
  {
    title: 'Expenses & NOI',
    metrics: [
      { label: 'Operating Expenses',     key: 'totalOperatingExpenses' as const, negate: true },
      { label: 'Net Operating Income',   key: 'netOperatingIncome'     as const },
      { label: 'Annual Debt Service',    key: 'annualDebtService'      as const, negate: true },
    ],
  },
  {
    title: 'Cash Flow',
    metrics: [
      { label: 'Annual Cash Flow',       key: 'annualCashFlow'         as const, highlight: true },
    ],
  },
  {
    title: 'Capital',
    metrics: [
      { label: 'Cash Invested',          key: 'cashInvested'           as const },
      { label: 'Loan Amount',            key: 'loanAmount'             as const },
      { label: 'Down Payment',           key: 'downPaymentAmount'      as const },
      { label: 'Year 1 Principal Paid',  key: 'principalPaidYear1'     as const },
    ],
  },
];

export function KeyMetricsPanel({ outputs }: KeyMetricsPanelProps) {
  return (
    <div className="bg-card rounded-2xl border border-border card-shadow overflow-hidden h-full">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-border/60">
        <h3 className="text-sm font-black text-foreground">Key Metrics</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">Full income statement</p>
      </div>

      <div className="p-4 space-y-4">
        {groups.map(group => (
          <div key={group.title}>
            {/* Group label */}
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.metrics.map(m => {
                const raw = outputs[m.key] as number;
                const val = 'negate' in m && m.negate ? -Math.abs(raw) : raw;
                const isNeg = val < 0;
                const isHighlight = 'highlight' in m && m.highlight;

                return (
                  <div
                    key={m.label}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg transition-colors',
                      isHighlight
                        ? isNeg
                          ? 'bg-destructive/8 border border-destructive/20'
                          : 'bg-success/8 border border-success/20'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <span className={cn(
                      'text-xs',
                      isHighlight ? 'font-bold text-foreground' : 'text-muted-foreground'
                    )}>
                      {m.label}
                    </span>
                    <span className={cn(
                      'text-sm font-bold tabular-nums',
                      isNeg ? 'text-destructive' : isHighlight ? (isNeg ? 'text-destructive' : 'text-success') : 'text-foreground'
                    )}>
                      {isNeg ? '-' : ''}&nbsp;${Math.abs(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
