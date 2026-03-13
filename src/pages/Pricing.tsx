import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check, Infinity, Star, Zap, Crown, ArrowLeft, DollarSign,
  BarChart3, Brain, FileText, Home, Bookmark, TrendingUp, Headphones,
  Shield, RefreshCw, CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const PRICES = {
  monthly: import.meta.env.VITE_STRIPE_PRICE_MONTHLY_ID,
  annual: import.meta.env.VITE_STRIPE_PRICE_ANNUAL_ID,
  lifetime: import.meta.env.VITE_STRIPE_PRICE_LIFETIME_ID,
};

const FREE_FEATURES = [
  { icon: BarChart3, text: 'Cash flow, cap rate & CoC ROI calculator' },
  { icon: Home, text: 'Basic deal metrics' },
  { icon: Bookmark, text: 'Up to 3 saved deals' },
];

const PRO_FEATURES = [
  { icon: Check, text: 'Everything in Free' },
  { icon: Zap, text: 'Zillow / Redfin / Realtor.com import' },
  { icon: Brain, text: 'One-Click AI Deal Analysis (3 scenarios)' },
  { icon: Brain, text: 'AI Deal Advisor' },
  { icon: Bookmark, text: 'Unlimited deal saves' },
  { icon: FileText, text: 'PDF export' },
  { icon: Home, text: 'Rent Estimator with live market comps' },
  { icon: TrendingUp, text: '10-year equity & cash flow projections' },
  { icon: Headphones, text: 'Priority support' },
];

const FAQS = [
  {
    q: 'Can I cancel my subscription anytime?',
    a: 'Yes. Cancel with one click from the billing portal — no questions asked. You keep Pro access until the end of your billing period.',
  },
  {
    q: 'What does the Lifetime plan include?',
    a: 'One payment of $149 gives you permanent Pro access — including every feature we ship in the future. No recurring charges ever.',
  },
  {
    q: 'Is there a free trial?',
    a: 'The Free plan is always free with no credit card required. You can explore all the core calculator features before deciding to upgrade.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'All major credit cards (Visa, Mastercard, Amex, Discover) via Stripe. Apple Pay and Google Pay are also accepted at checkout.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'Yes — 30-day money-back guarantee on all plans, no questions asked.',
  },
];

export default function Pricing() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const [loading, setLoading] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { isPro, isLifetime, plan } = useSubscription();
  const { user, openAuthDialog } = useAuth();

  const handleCheckout = async (priceKey: 'monthly' | 'annual' | 'lifetime') => {
    if (!user) { openAuthDialog(); return; }
    const priceId = PRICES[priceKey];
    if (!priceId) { toast.error('Pricing not configured. Please contact support.'); return; }
    setLoading(priceKey);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({ priceId, successUrl: window.location.origin, cancelUrl: window.location.href }),
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({ returnUrl: window.location.href }),
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
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">Deal Wise Rent</span>
        </div>
        <Link
          to="/"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to app
        </Link>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16 space-y-24">

        {/* Hero */}
        <section className="text-center space-y-5 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <Crown className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Deal Wise Pro</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            The full investor toolkit,<br />
            <span className="text-primary">at any budget</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Start free with our core calculator. Upgrade when you're ready to analyze deals faster with AI, live market data, and advanced projections.
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <div className="flex items-center bg-muted rounded-lg p-1 gap-1">
              <button
                onClick={() => setBilling('monthly')}
                className={cn(
                  'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                  billing === 'monthly' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling('annual')}
                className={cn(
                  'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                  billing === 'annual' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Annual
              </button>
            </div>
            {billing === 'annual' && (
              <span className="text-xs font-bold text-green-600 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20">
                Save 31%
              </span>
            )}
          </div>
        </section>

        {/* Pricing cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 -mt-4">

          {/* Free */}
          <div className={cn(
            'rounded-2xl border p-7 flex flex-col',
            plan === 'free' ? 'border-border bg-accent/20' : 'border-border/50 bg-card'
          )}>
            <div className="mb-6">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Free</p>
              <div className="flex items-end gap-1.5 mb-1">
                <span className="text-5xl font-bold">$0</span>
                <span className="text-muted-foreground mb-1.5">/mo</span>
              </div>
              <p className="text-sm text-muted-foreground">Always free, no credit card required.</p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {FREE_FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  {text}
                </li>
              ))}
            </ul>

            {plan === 'free' ? (
              <div className="w-full text-center text-sm font-semibold text-muted-foreground py-3 border border-border/50 rounded-xl bg-accent/30">
                Current Plan
              </div>
            ) : (
              <Link
                to="/"
                className="w-full text-center block text-sm font-semibold text-muted-foreground py-3 border border-border/50 rounded-xl hover:bg-accent/40 transition-colors"
              >
                Get Started Free
              </Link>
            )}
          </div>

          {/* Pro — highlighted */}
          <div className="rounded-2xl border-2 border-primary bg-primary/5 p-7 flex flex-col relative shadow-lg shadow-primary/10">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground text-[10px] font-bold px-4 py-1 rounded-full uppercase tracking-widest shadow-sm">
                Most Popular
              </span>
            </div>

            <div className="mb-6">
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Pro</p>
              <div className="flex items-end gap-1.5 mb-1">
                <span className="text-5xl font-bold">{billing === 'annual' ? '$8' : '$12'}</span>
                <span className="text-muted-foreground mb-1.5">/mo</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {billing === 'annual' ? 'Billed $99/year — save $45' : 'Billed monthly, cancel anytime'}
              </p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {PRO_FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-sm text-foreground">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  {text}
                </li>
              ))}
            </ul>

            {isPro && !isLifetime ? (
              <button
                onClick={handleManageBilling}
                disabled={loading === 'portal'}
                className="w-full flex items-center justify-center gap-2 bg-primary/20 text-primary text-sm font-semibold py-3 rounded-xl border border-primary/30 hover:bg-primary/30 transition-colors"
              >
                {loading === 'portal' ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                Manage Subscription
              </button>
            ) : isLifetime ? (
              <div className="w-full text-center text-sm font-semibold text-muted-foreground py-3 border border-border/50 rounded-xl bg-accent/30">
                Lifetime Access Active
              </div>
            ) : (
              <button
                onClick={() => handleCheckout(billing)}
                disabled={!!loading}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-semibold py-3 rounded-xl hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-60"
              >
                {loading === billing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                Get Pro
              </button>
            )}
          </div>

          {/* Lifetime */}
          <div className={cn(
            'rounded-2xl border p-7 flex flex-col',
            isLifetime ? 'border-amber-500/50 bg-amber-500/5' : 'border-border/50 bg-card'
          )}>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">Lifetime</p>
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              </div>
              <div className="flex items-end gap-1.5 mb-1">
                <span className="text-5xl font-bold">$149</span>
                <span className="text-muted-foreground mb-1.5"> once</span>
              </div>
              <p className="text-sm text-muted-foreground">Pay once, own it forever.</p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {PRO_FEATURES.map(({ text }) => (
                <li key={text} className="flex items-start gap-3 text-sm text-foreground">
                  <Check className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  {text}
                </li>
              ))}
              <li className="flex items-start gap-3 text-sm text-amber-600 font-semibold">
                <Infinity className="w-4 h-4 shrink-0 mt-0.5" />
                All future Pro features included
              </li>
            </ul>

            {isLifetime ? (
              <div className="w-full text-center text-sm font-semibold text-amber-600 py-3 border border-amber-500/30 rounded-xl bg-amber-500/5">
                ✓ Lifetime Access Active
              </div>
            ) : (
              <button
                onClick={() => handleCheckout('lifetime')}
                disabled={!!loading}
                className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white text-sm font-semibold py-3 rounded-xl hover:bg-amber-500/90 transition-colors shadow-sm disabled:opacity-60"
              >
                {loading === 'lifetime' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Star className="w-4 h-4" />
                )}
                Get Lifetime Access
              </button>
            )}
          </div>
        </section>

        {/* Trust strip */}
        <section className="flex flex-wrap items-center justify-center gap-6 py-4 border-y border-border/50 text-sm text-muted-foreground">
          <span className="flex items-center gap-2"><Shield className="w-4 h-4 text-green-500" /> 30-day money-back guarantee</span>
          <span className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary" /> Secure checkout via Stripe</span>
          <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 text-primary" /> Cancel anytime, no questions</span>
        </section>

        {/* Feature comparison table */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-center">Compare plans</h2>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/30">
                  <th className="text-left px-6 py-4 font-semibold text-foreground w-1/2">Feature</th>
                  <th className="px-4 py-4 font-semibold text-muted-foreground text-center">Free</th>
                  <th className="px-4 py-4 font-semibold text-primary text-center">Pro</th>
                  <th className="px-4 py-4 font-semibold text-amber-600 text-center">Lifetime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {[
                  ['Cash flow / cap rate / CoC ROI', true, true, true],
                  ['Basic deal metrics', true, true, true],
                  ['Saved deals', '3 max', 'Unlimited', 'Unlimited'],
                  ['Zillow / Redfin / Realtor.com import', false, true, true],
                  ['One-Click AI Deal Analysis', false, true, true],
                  ['AI Deal Advisor', false, true, true],
                  ['PDF export', false, true, true],
                  ['Rent Estimator with live market comps', false, true, true],
                  ['10-year projections', false, true, true],
                  ['Priority support', false, true, true],
                  ['All future Pro features', false, false, true],
                ].map(([feature, free, pro, life]) => (
                  <tr key={feature as string} className="hover:bg-accent/20 transition-colors">
                    <td className="px-6 py-3.5 text-foreground">{feature as string}</td>
                    <td className="px-4 py-3.5 text-center">{renderCell(free)}</td>
                    <td className="px-4 py-3.5 text-center">{renderCell(pro, 'primary')}</td>
                    <td className="px-4 py-3.5 text-center">{renderCell(life, 'amber')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-2xl mx-auto space-y-4">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently asked questions</h2>
          {FAQS.map((faq, i) => (
            <div key={i} className="border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-accent/30 transition-colors"
              >
                <span className="font-medium text-foreground">{faq.q}</span>
                <span className={cn('text-muted-foreground transition-transform duration-200', openFaq === i && 'rotate-45')}>
                  +
                </span>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </section>

        {/* CTA */}
        <section className="text-center space-y-5 py-8">
          <h2 className="text-3xl font-bold">Ready to invest smarter?</h2>
          <p className="text-muted-foreground">Start free today — upgrade when you need the full toolkit.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/"
              className="px-6 py-3 rounded-xl border border-border text-sm font-semibold hover:bg-accent/50 transition-colors"
            >
              Try for Free
            </Link>
            <button
              onClick={() => handleCheckout(billing)}
              disabled={!!loading || isPro || isLifetime}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Get Pro — {billing === 'annual' ? '$8/mo' : '$12/mo'}
            </button>
          </div>
        </section>

      </main>

      <footer className="border-t border-border text-center text-xs text-muted-foreground py-6">
        © {new Date().getFullYear()} Deal Wise Rent · Secure checkout powered by Stripe
      </footer>
    </div>
  );
}

function renderCell(value: boolean | string, color?: 'primary' | 'amber') {
  if (value === true) {
    const cls = color === 'primary' ? 'text-primary' : color === 'amber' ? 'text-amber-500' : 'text-green-500';
    return <Check className={cn('w-4 h-4 mx-auto', cls)} />;
  }
  if (value === false) {
    return <span className="text-muted-foreground/40 text-base leading-none">—</span>;
  }
  return (
    <span className={cn(
      'text-xs font-semibold',
      color === 'primary' ? 'text-primary' : color === 'amber' ? 'text-amber-600' : 'text-muted-foreground'
    )}>
      {value}
    </span>
  );
}
