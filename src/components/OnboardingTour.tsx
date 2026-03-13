import { useState, useEffect } from 'react';
import { X, Calculator, Zap, BarChart3, MapPin, ArrowRight, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'dealwise_onboarded_v1';

const STEPS = [
  {
    icon: <Calculator className="w-7 h-7 text-primary" />,
    badge: 'Step 1 of 3',
    title: 'Analyze any rental property',
    description:
      'Enter a property address or paste a Zillow / Redfin / Realtor.com URL to instantly auto-fill purchase price, rent, taxes, and expenses.',
    highlights: [
      { icon: <MapPin className="w-3.5 h-3.5" />, label: 'Import from Zillow, Redfin & Realtor.com' },
      { icon: <Calculator className="w-3.5 h-3.5" />, label: 'Cash flow, cap rate & CoC ROI — instantly' },
    ],
    cta: 'Next',
  },
  {
    icon: <Zap className="w-7 h-7 text-primary" />,
    badge: 'Step 2 of 3',
    title: 'One-Click AI Deal Analysis',
    description:
      'Let AI research live market data and generate 3 investment scenarios — conservative, moderate, and aggressive — with 10-year equity projections.',
    highlights: [
      { icon: <Zap className="w-3.5 h-3.5" />, label: 'Live web search for current prices & rents' },
      { icon: <BarChart3 className="w-3.5 h-3.5" />, label: '3 scenarios with 5yr & 10yr equity forecasts' },
    ],
    cta: 'Next',
  },
  {
    icon: <BarChart3 className="w-7 h-7 text-primary" />,
    badge: 'Step 3 of 3',
    title: 'Everything in one place',
    description:
      'Use the tabs to switch between the calculator, rent estimator, and your saved deals. Export any analysis as a PDF to share with partners.',
    highlights: [
      { icon: <BarChart3 className="w-3.5 h-3.5" />, label: 'Rent Estimator — live market rental comps' },
      { icon: <Calculator className="w-3.5 h-3.5" />, label: 'Save, compare & export deals as PDF' },
    ],
    cta: 'Get Started',
  },
] as const;

export function OnboardingTour() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      // Small delay so the app fully paints first
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      localStorage.setItem(STORAGE_KEY, '1');
    }, 250);
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;

  const current = STEPS[step];

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-250',
        exiting ? 'opacity-0' : 'opacity-100'
      )}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={dismiss}
      />

      {/* Card */}
      <div
        className={cn(
          'relative w-full max-w-sm bg-card rounded-2xl border border-border shadow-2xl overflow-hidden transition-all duration-250',
          exiting ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        )}
      >
        {/* Top accent bar */}
        <div className="h-1 bg-primary w-full" style={{ width: `${((step + 1) / STEPS.length) * 100}%`, transition: 'width 0.3s ease' }} />

        {/* Dismiss */}
        <button
          onClick={dismiss}
          className="absolute top-3.5 right-3.5 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Skip tour"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-6 pt-5 pb-6 space-y-4">
          {/* Icon + badge */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              {current.icon}
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {current.badge}
            </span>
          </div>

          {/* Title & description */}
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-foreground leading-tight">{current.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{current.description}</p>
          </div>

          {/* Highlights */}
          <div className="space-y-2">
            {current.highlights.map((h, i) => (
              <div key={i} className="flex items-center gap-2.5 bg-primary/5 rounded-lg px-3 py-2">
                <span className="text-primary shrink-0">{h.icon}</span>
                <span className="text-xs font-medium text-foreground">{h.label}</span>
              </div>
            ))}
          </div>

          {/* Footer: dots + button */}
          <div className="flex items-center justify-between pt-1">
            {/* Progress dots */}
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={cn(
                    'rounded-full transition-all duration-200',
                    i === step
                      ? 'w-5 h-2 bg-primary'
                      : 'w-2 h-2 bg-muted hover:bg-muted-foreground/40'
                  )}
                  aria-label={`Go to step ${i + 1}`}
                />
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={next}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              {current.cta}
              {step < STEPS.length - 1
                ? <ChevronRight className="w-4 h-4" />
                : <ArrowRight className="w-4 h-4" />
              }
            </button>
          </div>

          {/* Skip */}
          {step < STEPS.length - 1 && (
            <button
              onClick={dismiss}
              className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip tour
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
