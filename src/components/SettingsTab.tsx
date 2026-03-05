import { CalculatorState, defaultState } from '@/types/calculator';
import { CurrencyInput } from './CurrencyInput';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface SettingsTabProps {
  state: CalculatorState;
  updateField: <K extends keyof CalculatorState>(field: K, value: CalculatorState[K]) => void;
  onReset: () => void;
}

export function SettingsTab({ state, updateField, onReset }: SettingsTabProps) {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-foreground">Settings</h1>
      <p className="text-sm text-muted-foreground">Adjust default assumptions used in all calculations.</p>

      <div className="bg-card rounded-lg border border-border p-5 space-y-4">
        <h3 className="text-sm font-bold text-foreground">Default Assumptions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CurrencyInput label="Vacancy Rate" value={state.vacancyRate} onChange={v => updateField('vacancyRate', v)} prefix="" suffix="%" />
          <CurrencyInput label="Appreciation Rate" value={state.appreciationRate} onChange={v => updateField('appreciationRate', v)} prefix="" suffix="%" />
          <CurrencyInput label="Annual Rent Increase" value={state.annualRentIncrease} onChange={v => updateField('annualRentIncrease', v)} prefix="" suffix="%" />
          <CurrencyInput label="Annual Expense Increase" value={state.annualExpenseIncrease} onChange={v => updateField('annualExpenseIncrease', v)} prefix="" suffix="%" />
          <CurrencyInput label="Loan Term" value={state.loanTerm} onChange={v => updateField('loanTerm', v)} prefix="" suffix="yrs" />
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-5 space-y-4">
        <h3 className="text-sm font-bold text-foreground">Property Management</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">DIY Property Management</p>
            <p className="text-xs text-muted-foreground">Exclude PM fee from calculations</p>
          </div>
          <Switch checked={state.isDIY} onCheckedChange={v => updateField('isDIY', v)} />
        </div>
      </div>

      <Button
        variant="outline"
        onClick={() => {
          onReset();
          toast.success('Settings reset to defaults');
        }}
        className="w-full"
      >
        <RotateCcw className="w-4 h-4 mr-1.5" /> Reset to Defaults
      </Button>
    </div>
  );
}
