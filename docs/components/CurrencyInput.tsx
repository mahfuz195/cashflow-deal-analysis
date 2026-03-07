import { cn } from '@/lib/utils';

interface CurrencyInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  prefix?: string;
  suffix?: string;
  hint?: string;
  className?: string;
}

export function CurrencyInput({ label, value, onChange, prefix = '$', suffix, hint, className }: CurrencyInputProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-sm text-muted-foreground font-medium">{prefix}</span>
        )}
        <input
          type="number"
          value={value || ''}
          onChange={e => onChange(Number(e.target.value) || 0)}
          className={cn(
            "w-full h-10 rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-150",
            prefix && "pl-7",
            suffix && "pr-8"
          )}
        />
        {suffix && (
          <span className="absolute right-3 text-sm text-muted-foreground font-medium">{suffix}</span>
        )}
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
