import { Download, FileSpreadsheet, ShieldCheck, Star } from 'lucide-react';

// Paste your Stripe Payment Link here
const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/dRmbJ1c3R15BbZA26Gbwk00';

const features = [
  'Full cash flow & cap rate analysis',
  'Amortization schedule built-in',
  '10-year equity & appreciation projections',
  'Works offline — no login needed',
];

export function DownloadCalculatorCard() {
  const handleBuy = () => {
    window.location.href = STRIPE_PAYMENT_LINK;
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, hsl(263 80% 58%), hsl(220 80% 62%))' }} />

      <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">

        {/* Icon + details */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, hsl(142 70% 45%), hsl(160 70% 40%))' }}
          >
            <FileSpreadsheet className="w-5 h-5 text-white" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-foreground text-sm">Pro Calculator Spreadsheet</p>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 border border-yellow-500/20">
                <Star className="w-2.5 h-2.5" /> Excel
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Standalone Excel file — use it anywhere, even offline.</p>
            <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5">
              {features.map(f => (
                <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="w-3 h-3 text-green-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Price + CTA */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
          <div className="text-right">
            <p className="text-xl font-black text-foreground">$2.99</p>
            <p className="text-[11px] text-muted-foreground">one-time · instant download</p>
          </div>
          <button
            onClick={handleBuy}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white btn-gradient shadow-sm hover:shadow-md transition-all whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Buy & Download
          </button>
        </div>

      </div>
    </div>
  );
}
