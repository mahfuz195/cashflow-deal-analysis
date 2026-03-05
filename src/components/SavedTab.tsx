import { SavedCalculation } from '@/types/calculator';
import { Trash2, ArrowRight, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SavedTabProps {
  saved: SavedCalculation[];
  onLoad: (calc: SavedCalculation) => void;
  onDelete: (id: string) => void;
}

export function SavedTab({ saved, onLoad, onDelete }: SavedTabProps) {
  const ratingColors: Record<string, string> = {
    Excellent: 'text-success',
    Good: 'text-success',
    Marginal: 'text-warning',
    Negative: 'text-destructive',
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-foreground">Saved Calculations</h1>

      {saved.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center space-y-3">
          <Bookmark className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">No saved calculations yet.</p>
          <p className="text-xs text-muted-foreground">Go to the Calculator tab and save an analysis to see it here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {saved.map(calc => (
            <div
              key={calc.id}
              className="bg-card rounded-lg border border-border p-4 flex items-center justify-between gap-4 hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => onLoad(calc)}
            >
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-foreground truncate">{calc.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ${calc.summary.purchasePrice.toLocaleString()} · {new Date(calc.savedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">${calc.summary.monthlyCashFlow.toFixed(0)}/mo</p>
                  <p className={cn("text-xs font-semibold", ratingColors[calc.summary.dealRating])}>
                    {calc.summary.cocROI.toFixed(1)}% CoC
                  </p>
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onDelete(calc.id);
                    toast.success('Calculation deleted');
                  }}
                  className="p-2 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
