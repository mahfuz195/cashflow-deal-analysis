/**
 * Affiliate / Partner Links
 *
 * Replace the `href` values in PARTNERS below with your actual affiliate URLs.
 * The `rel="sponsored"` attribute correctly signals paid links to search engines.
 */

import { useState } from 'react';
import { ExternalLink, Building2, TrendingDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Partner {
  name: string;
  tagline: string;
  cta: string;
  href: string; // ← replace with your affiliate URL
  badge?: string;
}

// ─── Edit your partners here ─────────────────────────────────────────────────
const PARTNERS: Partner[] = [
  {
    name: 'Rocket Mortgage',
    tagline: 'Fast online pre-approval in minutes. Trusted by millions of homebuyers.',
    cta: 'Get Pre-Approved',
    href: 'https://www.rocketmortgage.com/', // ← your affiliate link
    badge: 'Most Popular',
  },
  {
    name: 'LendingTree',
    tagline: 'Compare rates from multiple lenders side-by-side. Free, no obligation.',
    cta: 'Compare Rates',
    href: 'https://www.lendingtree.com/', // ← your affiliate link
  },
  {
    name: 'Better.com',
    tagline: 'No lender fees, no commissions. Close in as few as 3 weeks.',
    cta: 'Get a Quote',
    href: 'https://better.com/', // ← your affiliate link
  },
];
// ─────────────────────────────────────────────────────────────────────────────

export function AffiliateLinks() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Trigger button — prominent CTA */}
      <button
        onClick={() => setOpen(true)}
        className="relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-semibold text-xs text-white shadow-md transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-lg overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 50%, #166534 100%)' }}
      >
        {/* Shimmer effect */}
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer pointer-events-none" />
        <Building2 className="w-3.5 h-3.5 relative shrink-0" />
        <span className="relative">Finance this deal</span>
        <span className="relative ml-0.5 bg-white/20 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
          Best rates ↗
        </span>
      </button>

      {/* Modal with partner options */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <div className="p-5 space-y-4">
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-base font-bold">Finance This Deal</DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sponsored mortgage partners — compare rates and get pre-approved.
                  </p>
                </div>
                <span className="text-[9px] text-muted-foreground/40 font-medium mt-1 shrink-0">Ad</span>
              </div>
            </DialogHeader>

            <div className="space-y-2">
              {PARTNERS.map((p) => (
                <a
                  key={p.name}
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  onClick={() => setOpen(false)}
                  className="group flex items-center justify-between gap-3 rounded-lg border border-border hover:border-primary/40 bg-card hover:bg-accent/20 px-4 py-3 transition-all duration-150"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {p.name}
                      </span>
                      {p.badge && (
                        <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                          {p.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{p.tagline}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-primary shrink-0">
                    {p.cta}
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </a>
              ))}
            </div>

            <p className="text-[10px] text-muted-foreground/50 text-center">
              Deal Wise Rent may earn a commission from these partners at no cost to you.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
