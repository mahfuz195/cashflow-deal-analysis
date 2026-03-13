import { useState } from 'react';
import { X, Check, Zap, Infinity, Star, Loader2, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const PRICES = {
  monthly: import.meta.env.VITE_STRIPE_PRICE_MONTHLY_ID,
  annual:  import.meta.env.VITE_STRIPE_PRICE_ANNUAL_ID,
  lifetime: import.meta.env.VITE_STRIPE_PRICE_LIFETIME_ID,
};

const FREE_FEATURES = [
  'Cash flow, cap rate & CoC ROI calculator',
  'Basic deal metrics',
  'Up to 3 saved deals',
];

const PRO_FEATURES = [
  'Everything in Free',
  'Zillow / Redfin / Realtor.com import',
  'One-Click AI Deal Analysis (3 scenarios)',
  'AI Deal Advisor',
  'Unlimited deal saves',
  'PDF export',
  'Rent Estimator with live market comps',
  '10-year equity & cash flow projections',
  'Priority support',
];

export function PricingModal() {
  const { pricingModalOpen, closePricingModal, isPro, isLifetime, plan } = useSubscription();
  const { user, openAuthDialog } = useAuth();
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const [loading, setLoading] = useState<string | null>(null);

  if (!pricingModalOpen) return null;

  const handleCheckout = async (priceKey: 'monthly' | 'annual' | 'lifetime') => {
    if (!user) {
      closePricingModal();
      openAuthDialog();
      return;
    }

    const priceId = PRICES[priceKey];
    if (!priceId) {
      toast.error('Pricing not configured. Please contact support.');
      return;
    }

    setLoading(priceKey);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          priceId,
          successUrl: window.location.origin,
          cancelUrl: window.location.origin,
        }),
      });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to start checkout');
      setLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setLoading('portal');
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ returnUrl: window.location.origin }),
      });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to open billing portal');
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={closePricingModal} />

      {/* Modal */}
      <div className="relative w-full max-w-3xl bg-card rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border px-6 pt-6 pb-5">
          <button
            onClick={closePricingModal}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-5 h-5 text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Deal Wise Pro</span>
          </div>
          <h2 className="text-xl font-bold text-foreground">Unlock the full investor toolkit</h2>
          <p className="text-sm text-muted-foreground mt-1">
            AI deal analysis, live property data, unlimited saves & more.
          </p>

          {/* Billing toggle */}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setBilling('monthly')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  billing === 'monthly' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling('annual')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  billing === 'annual' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Annual
              </button>
            </div>
            {billing === 'annual' && (
              <span className="text-[11px] font-bold text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full">
                Save 31%
              </span>
            )}
          </div>
        </div>

        {/* Plans */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Free */}
          <div className={cn(
            'rounded-xl border p-5 flex flex-col',
            plan === 'free' ? 'border-border bg-accent/20' : 'border-border/50'
          )}>
            <div className="mb-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Free</p>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-bold text-foreground">$0</span>
                <span className="text-sm text-muted-foreground mb-1">/mo</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Always free, no credit card</p>
            </div>
            <ul className="space-y-2 flex-1 mb-5">
              {FREE_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            {plan === 'free' ? (
              <div className="w-full text-center text-xs font-semibold text-muted-foreground py-2 border border-border/50 rounded-lg bg-accent/30">
                Current Plan
              </div>
            ) : (
              <button
                onClick={closePricingModal}
                className="w-full text-center text-xs font-semibold text-muted-foreground py-2 border border-border/50 rounded-lg hover:bg-accent/40 transition-colors"
              >
                Continue Free
              </button>
            )}
          </div>

          {/* Pro — highlighted */}
          <div className={cn(
            'rounded-xl border-2 p-5 flex flex-col relative',
            plan === 'pro' ? 'border-primary bg-primary/5' : 'border-primary bg-primary/5'
          )}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                Most Popular
              </span>
            </div>
            <div className="mb-4">
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Pro</p>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-bold text-foreground">
                  {billing === 'annual' ? '$8' : '$12'}
                </span>
                <span className="text-sm text-muted-foreground mb-1">/mo</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {billing === 'annual' ? 'Billed $99/year' : 'Billed monthly'}
              </p>
            </div>
            <ul className="space-y-2 flex-1 mb-5">
              {PRO_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-xs text-foreground">
                  <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            {isPro && !isLifetime ? (
              <button
                onClick={handleManageBilling}
                disabled={loading === 'portal'}
                className="w-full flex items-center justify-center gap-2 bg-primary/20 text-primary text-sm font-semibold py-2.5 rounded-lg border border-primary/30"
              >
                {loading === 'portal' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Manage Subscription
              </button>
            ) : isLifetime ? (
              <div className="w-full text-center text-xs font-semibold text-muted-foreground py-2 border border-border/50 rounded-lg bg-accent/30">
                Lifetime Access Active
              </div>
            ) : (
              <button
                onClick={() => handleCheckout(billing)}
                disabled={!!loading}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-semibold py-2.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
              >
                {loading === billing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                Get Pro
              </button>
            )}
          </div>

          {/* Lifetime */}
          <div className={cn(
            'rounded-xl border p-5 flex flex-col',
            isLifetime ? 'border-amber-500/50 bg-amber-500/5' : 'border-border/50'
          )}>
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-1">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">Lifetime</p>
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              </div>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-bold text-foreground">$149</span>
                <span className="text-sm text-muted-foreground mb-1"> once</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Pay once, own it forever</p>
            </div>
            <ul className="space-y-2 flex-1 mb-5">
              {PRO_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-xs text-foreground">
                  <Check className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
              <li className="flex items-start gap-2 text-xs text-amber-600 font-semibold">
                <Infinity className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                All future Pro features included
              </li>
            </ul>
            {isLifetime ? (
              <div className="w-full text-center text-xs font-semibold text-amber-600 py-2 border border-amber-500/30 rounded-lg bg-amber-500/5">
                ✓ Lifetime Access Active
              </div>
            ) : (
              <button
                onClick={() => handleCheckout('lifetime')}
                disabled={!!loading}
                className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-amber-500/90 transition-colors shadow-sm"
              >
                {loading === 'lifetime' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Star className="w-4 h-4" />
                )}
                Get Lifetime Access
              </button>
            )}
          </div>
        </div>

        <div className="px-6 pb-5 text-center text-[11px] text-muted-foreground">
          Secure checkout powered by Stripe · Cancel anytime · 30-day money-back guarantee
        </div>
      </div>
    </div>
  );
}
