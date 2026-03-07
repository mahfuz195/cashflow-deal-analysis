import { CalculatorOutputs } from '@/types/calculator';
import { cn } from '@/lib/utils';

interface KeyMetricsPanelProps {
  outputs: CalculatorOutputs;
}

export function KeyMetricsPanel({ outputs }: KeyMetricsPanelProps) {
  const metrics = [
    { label: 'Gross Rental Income', value: outputs.grossRentalIncome },
    { label: 'Effective Gross Income', value: outputs.effectiveGrossIncome },
    { label: 'Operating Expenses', value: -outputs.totalOperatingExpenses },
    { label: 'Net Operating Income', value: outputs.netOperatingIncome },
    { label: 'Annual Debt Service', value: -outputs.annualDebtService },
    { label: 'Annual Cash Flow', value: outputs.annualCashFlow, highlight: true },
    { label: 'Cash Invested', value: outputs.cashInvested },
    { label: 'Loan Amount', value: outputs.loanAmount },
    { label: 'Down Payment', value: outputs.downPaymentAmount },
    { label: 'Year 1 Principal Paid', value: outputs.principalPaidYear1 },
  ];

  return (
    <div className="bg-card rounded-lg border border-border p-4 space-y-2">
      <h3 className="text-sm font-bold text-foreground mb-3">Key Metrics</h3>
      {metrics.map(m => {
        const isNeg = m.value < 0;
        return (
          <div key={m.label} className={cn("flex justify-between items-center py-1.5 border-b border-border last:border-0", m.highlight && "font-bold")}>
            <span className="text-xs text-muted-foreground">{m.label}</span>
            <span className={cn("text-sm font-semibold", isNeg ? "text-destructive" : "text-foreground")}>
              {isNeg ? '-' : ''}${Math.abs(m.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
