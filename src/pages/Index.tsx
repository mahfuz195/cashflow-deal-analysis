import { useState, useEffect, useCallback } from 'react';
import { AppLayout, useAppLayout } from '@/components/AppLayout';
import { CalculatorTab } from '@/components/CalculatorTab';
import { RentEstimatorTab } from '@/components/RentEstimatorTab';
import { SavedTab } from '@/components/SavedTab';
import { SettingsTab } from '@/components/SettingsTab';
import { DealCoach } from '@/components/DealCoach';
import { useCalculator } from '@/hooks/useCalculator';
import { SavedCalculation } from '@/types/calculator';

const STORAGE_KEY = 'cashflow_saved_v2';

function loadSaved(): SavedCalculation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function AppContent() {
  const { activeTab, setActiveTab } = useAppLayout();
  const calculator = useCalculator();
  const [saved, setSaved] = useState<SavedCalculation[]>(loadSaved);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // Storage full
    }
  }, [saved]);

  const handleSave = useCallback((name: string) => {
    const newCalc: SavedCalculation = {
      id: crypto.randomUUID(),
      name,
      savedAt: new Date().toISOString(),
      state: { ...calculator.state },
      summary: {
        purchasePrice: calculator.state.purchasePrice,
        monthlyCashFlow: calculator.outputs.monthlyCashFlow,
        cocROI: calculator.outputs.cashOnCashROI,
        dealRating: calculator.outputs.dealRating,
      },
    };
    setSaved(prev => [newCalc, ...prev]);
  }, [calculator.state, calculator.outputs]);

  const handleLoad = useCallback((calc: SavedCalculation) => {
    calculator.loadState(calc.state);
    setActiveTab('calculator');
  }, [calculator, setActiveTab]);

  const handleDelete = useCallback((id: string) => {
    setSaved(prev => prev.filter(c => c.id !== id));
  }, []);

  const handleUseRent = useCallback((rent: number) => {
    calculator.updateField('rentPerUnit', rent);
    setActiveTab('calculator');
  }, [calculator, setActiveTab]);

  return (
    <>
      {activeTab === 'calculator' && <CalculatorTab calculator={calculator} onSave={handleSave} />}
      {activeTab === 'rent-estimator' && <RentEstimatorTab onUseRent={handleUseRent} />}
      {activeTab === 'saved' && <SavedTab saved={saved} onLoad={handleLoad} onDelete={handleDelete} />}
      {activeTab === 'settings' && <SettingsTab state={calculator.state} updateField={calculator.updateField} onReset={calculator.resetState} />}
      <DealCoach calculatorState={calculator.state} updateField={calculator.updateField} />
    </>
  );
}

const Index = () => {
  return (
    <AppLayout>
      <AppContent />
    </AppLayout>
  );
};

export default Index;
