import { useState, useEffect, useCallback, useRef } from 'react';
import { AppLayout, useAppLayout } from '@/components/AppLayout';
import { CalculatorTab } from '@/components/CalculatorTab';
import { RentEstimatorTab } from '@/components/RentEstimatorTab';
import { SavedTab } from '@/components/SavedTab';
import { SettingsTab } from '@/components/SettingsTab';
import { DealCoach } from '@/components/DealCoach';
import { OnboardingTour } from '@/components/OnboardingTour';
import { useCalculator } from '@/hooks/useCalculator';
import { SavedCalculation } from '@/types/calculator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

function AppContent() {
  const { activeTab, setActiveTab } = useAppLayout();
  const { user, openAuthDialog } = useAuth();
  const calculator = useCalculator();
  const [saved, setSaved] = useState<SavedCalculation[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const openCoachRef = useRef<() => void>(() => {});

  // Load saved deals from Supabase when user logs in
  useEffect(() => {
    if (!user) {
      setSaved([]);
      setLoadingDeals(false);
      return;
    }
    setLoadingDeals(true);

    supabase
      .from('saved_deals')
      .select('*')
      .order('saved_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast.error('Failed to load saved deals');
        } else if (data) {
          const deals: SavedCalculation[] = data.map(row => ({
            id: row.id,
            name: row.name,
            savedAt: row.saved_at,
            state: row.state as SavedCalculation['state'],
            summary: row.summary as SavedCalculation['summary'],
          }));
          setSaved(deals);
        }
        setLoadingDeals(false);
      });
  }, [user]);

  const handleSave = useCallback(async (name: string) => {
    if (!user) {
      openAuthDialog();
      return;
    }

    const summary = {
      purchasePrice: calculator.state.purchasePrice,
      monthlyCashFlow: calculator.outputs.monthlyCashFlow,
      cocROI: calculator.outputs.cashOnCashROI,
      dealRating: calculator.outputs.dealRating,
    };

    const { data, error } = await supabase
      .from('saved_deals')
      .insert({
        user_id: user.id,
        name,
        state: calculator.state as unknown as Record<string, unknown>,
        summary: summary as unknown as Record<string, unknown>,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to save deal');
    } else if (data) {
      const newCalc: SavedCalculation = {
        id: data.id,
        name: data.name,
        savedAt: data.saved_at,
        state: data.state as SavedCalculation['state'],
        summary: data.summary as SavedCalculation['summary'],
      };
      setSaved(prev => [newCalc, ...prev]);
    }
  }, [user, openAuthDialog, calculator.state, calculator.outputs]);

  const handleLoad = useCallback((calc: SavedCalculation) => {
    calculator.loadState(calc.state);
    setActiveTab('calculator');
  }, [calculator, setActiveTab]);

  const handleDelete = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('saved_deals')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete deal');
    } else {
      setSaved(prev => prev.filter(c => c.id !== id));
      toast.success('Calculation deleted');
    }
  }, []);

  const handleUseRent = useCallback((rent: number) => {
    calculator.updateField('rentPerUnit', rent);
    setActiveTab('calculator');
  }, [calculator, setActiveTab]);

  return (
    <>
      {activeTab === 'calculator' && <CalculatorTab calculator={calculator} onSave={handleSave} onOpenCoach={() => openCoachRef.current()} />}
      {activeTab === 'rent-estimator' && <RentEstimatorTab onUseRent={handleUseRent} />}
      {activeTab === 'saved' && (
        <SavedTab
          saved={saved}
          onLoad={handleLoad}
          onDelete={handleDelete}
          loading={loadingDeals}
        />
      )}
      {activeTab === 'settings' && <SettingsTab state={calculator.state} updateField={calculator.updateField} onReset={calculator.resetState} />}
      <DealCoach
        calculatorState={calculator.state}
        updateField={calculator.updateField}
        onOpenRef={fn => { openCoachRef.current = fn; }}
      />
    </>
  );
}

const Index = () => {
  return (
    <AppLayout>
      <AppContent />
      <OnboardingTour />
    </AppLayout>
  );
};

export default Index;
