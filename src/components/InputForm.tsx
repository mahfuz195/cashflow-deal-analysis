import { CalculatorState } from '@/types/calculator';
import { CurrencyInput } from './CurrencyInput';
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InputFormProps {
  state: CalculatorState;
  updateField: <K extends keyof CalculatorState>(field: K, value: CalculatorState[K]) => void;
}

function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-foreground hover:bg-accent/50 transition-colors"
      >
        {title}
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>}
    </div>
  );
}

export function InputForm({ state, updateField }: InputFormProps) {
  const downPaymentAmount = state.purchasePrice * (state.downPaymentPercent / 100);
  const totalRent = state.rentPerUnit * state.numberOfUnits;

  return (
    <div className="space-y-3">
      <Section title="Purchase Details">
        <CurrencyInput label="Purchase Price" value={state.purchasePrice} onChange={v => updateField('purchasePrice', v)} />
        <CurrencyInput label="Improvements / Rehab" value={state.improvements} onChange={v => updateField('improvements', v)} />
        <CurrencyInput label="Closing Costs" value={state.closingCosts} onChange={v => updateField('closingCosts', v)} />
      </Section>

      <Section title="Financing">
        <CurrencyInput
          label="Down Payment"
          value={state.downPaymentPercent}
          onChange={v => updateField('downPaymentPercent', v)}
          prefix=""
          suffix="%"
          hint={`$${downPaymentAmount.toLocaleString()}`}
        />
        <CurrencyInput label="Interest Rate" value={state.interestRate} onChange={v => updateField('interestRate', v)} prefix="" suffix="%" />
        <CurrencyInput label="Loan Term (years)" value={state.loanTerm} onChange={v => updateField('loanTerm', v)} prefix="" suffix="yrs" />
      </Section>

      <Section title="Income">
        <CurrencyInput label="Rent Per Unit / Month" value={state.rentPerUnit} onChange={v => updateField('rentPerUnit', v)} />
        <CurrencyInput
          label="Number of Units"
          value={state.numberOfUnits}
          onChange={v => updateField('numberOfUnits', v)}
          prefix=""
          hint={`Total rent: $${totalRent.toLocaleString()}/mo`}
        />
        <CurrencyInput label="Vacancy Rate" value={state.vacancyRate} onChange={v => updateField('vacancyRate', v)} prefix="" suffix="%" />
        <CurrencyInput label="Annual Rent Increase" value={state.annualRentIncrease} onChange={v => updateField('annualRentIncrease', v)} prefix="" suffix="%" />
      </Section>

      <Section title="Expenses" defaultOpen={true}>
        <CurrencyInput label="Property Taxes (Annual)" value={state.propertyTaxes} onChange={v => updateField('propertyTaxes', v)} />
        <CurrencyInput label="Insurance (Annual)" value={state.insurance} onChange={v => updateField('insurance', v)} />
        <CurrencyInput label="Maintenance / CapEx (Annual)" value={state.maintenanceCapex} onChange={v => updateField('maintenanceCapex', v)} />
        <CurrencyInput label="PM Fee % of EGI" value={state.propertyManagementFee} onChange={v => updateField('propertyManagementFee', v)} prefix="" suffix="%" />
      </Section>

      <Section title="Other Expenses" defaultOpen={false}>
        <CurrencyInput label="HOA (Monthly/Unit)" value={state.hoa} onChange={v => updateField('hoa', v)} />
        <CurrencyInput label="Sewer (Monthly/Unit)" value={state.sewer} onChange={v => updateField('sewer', v)} />
        <CurrencyInput label="Water (Monthly/Unit)" value={state.water} onChange={v => updateField('water', v)} />
        <CurrencyInput label="Lawn Care (Monthly, 7mo)" value={state.lawnCare} onChange={v => updateField('lawnCare', v)} />
        <CurrencyInput label="Tenant Placement (Annual)" value={state.tenantPlacementFee} onChange={v => updateField('tenantPlacementFee', v)} />
        <CurrencyInput label="Lease Renewal (Annual)" value={state.leaseRenewalFee} onChange={v => updateField('leaseRenewalFee', v)} />
        <CurrencyInput label="Annual Tune-up Fee" value={state.annualTuneupFee} onChange={v => updateField('annualTuneupFee', v)} />
        <CurrencyInput label="Annual Expense Increase" value={state.annualExpenseIncrease} onChange={v => updateField('annualExpenseIncrease', v)} prefix="" suffix="%" />
      </Section>
    </div>
  );
}
