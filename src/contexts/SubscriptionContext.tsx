import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

const SUBSCRIPTION_BYPASS = import.meta.env.DEV;

export type Plan = 'free' | 'pro' | 'lifetime';

interface SubscriptionContextType {
  plan: Plan;
  isPro: boolean;       // true for both 'pro' and 'lifetime'
  isLifetime: boolean;
  isLoading: boolean;
  openPricingModal: () => void;
  closePricingModal: () => void;
  pricingModalOpen: boolean;
  refresh: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  plan: 'free',
  isPro: false,
  isLifetime: false,
  isLoading: true,
  openPricingModal: () => {},
  closePricingModal: () => {},
  pricingModalOpen: false,
  refresh: () => {},
});

export const useSubscription = () => useContext(SubscriptionContext);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan>(SUBSCRIPTION_BYPASS ? 'lifetime' : 'free');
  const [isLoading, setIsLoading] = useState(!SUBSCRIPTION_BYPASS);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);

  const fetchSubscription = useCallback(async () => {
    if (SUBSCRIPTION_BYPASS) {
      setPlan('lifetime');
      setIsLoading(false);
      return;
    }

    if (!user) {
      setPlan('free');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data } = await supabase
      .from('user_subscriptions')
      .select('plan, status, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!data) {
      setPlan('free');
    } else if (data.plan === 'lifetime') {
      setPlan('lifetime');
    } else if (data.plan === 'pro' && (data.status === 'active' || data.status === 'trialing')) {
      setPlan('pro');
    } else {
      // Check if period hasn't ended yet (grace period)
      if (data.current_period_end && new Date(data.current_period_end) > new Date()) {
        setPlan('pro');
      } else {
        setPlan('free');
      }
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Check for ?upgraded=1 redirect from Stripe checkout
  useEffect(() => {
    if (SUBSCRIPTION_BYPASS) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('upgraded') === '1') {
      // Stripe webhooks may take a few seconds — poll briefly
      let attempts = 0;
      const interval = setInterval(() => {
        fetchSubscription();
        attempts++;
        if (attempts >= 5) clearInterval(interval);
      }, 2000);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchSubscription]);

  const isPro = plan === 'pro' || plan === 'lifetime';
  const isLifetime = plan === 'lifetime';

  return (
    <SubscriptionContext.Provider value={{
      plan,
      isPro,
      isLifetime,
      isLoading,
      pricingModalOpen,
      openPricingModal: () => {
        if (!SUBSCRIPTION_BYPASS) setPricingModalOpen(true);
      },
      closePricingModal: () => setPricingModalOpen(false),
      refresh: fetchSubscription,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}
