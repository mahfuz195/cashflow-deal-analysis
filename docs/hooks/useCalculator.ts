import { useState, useMemo, useCallback } from 'react';
import { CalculatorState, CalculatorOutputs, defaultState } from '@/types/calculator';

function safeNum(val: number): number {
  if (!isFinite(val) || isNaN(val)) return 0;
  return val;
}

function pmtCalc(rate: number, nper: number, pv: number): number {
  if (rate === 0) return pv / nper;
  const r = rate / 12;
  const n = nper * 12;
  return (pv * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function principalYear1(rate: number, loanAmount: number, monthlyPayment: number): number {
  if (loanAmount <= 0) return 0;
  let balance = loanAmount;
  let totalPrincipal = 0;
  const monthlyRate = rate / 12;
  for (let i = 0; i < 12; i++) {
    const interest = balance * monthlyRate;
    const principal = monthlyPayment - interest;
    totalPrincipal += principal;
    balance -= principal;
  }
  return totalPrincipal;
}

function getAmortizationSchedule(rate: number, loanAmount: number, monthlyPayment: number, years: number) {
  let balance = loanAmount;
  const monthlyRate = rate / 12;
  const data: { year: number; principal: number; interest: number }[] = [];

  for (let y = 1; y <= years; y++) {
    let yearPrincipal = 0;
    let yearInterest = 0;
    for (let m = 0; m < 12; m++) {
      if (balance <= 0) break;
      const interest = balance * monthlyRate;
      const principal = Math.min(monthlyPayment - interest, balance);
      yearPrincipal += principal;
      yearInterest += interest;
      balance -= principal;
    }
    data.push({ year: y, principal: yearPrincipal, interest: yearInterest });
  }
  return data;
}

export function useCalculator() {
  const [state, setState] = useState<CalculatorState>(defaultState);

  const updateField = useCallback(<K extends keyof CalculatorState>(field: K, value: CalculatorState[K]) => {
    setState(prev => ({ ...prev, [field]: value }));
  }, []);

  const loadState = useCallback((newState: CalculatorState) => {
    setState(newState);
  }, []);

  const resetState = useCallback(() => {
    setState(defaultState);
  }, []);

  const outputs: CalculatorOutputs = useMemo(() => {
    const {
      purchasePrice, improvements, closingCosts, downPaymentPercent, interestRate,
      loanTerm, rentPerUnit, numberOfUnits, vacancyRate, annualRentIncrease,
      propertyTaxes, insurance, maintenanceCapex, propertyManagementFee,
      hoa, sewer, water, lawnCare, tenantPlacementFee, leaseRenewalFee,
      annualTuneupFee, annualExpenseIncrease, appreciationRate, isDIY
    } = state;

    const downPaymentAmount = purchasePrice * (downPaymentPercent / 100);
    const loanAmount = purchasePrice - downPaymentAmount;
    const grossRentalIncome = rentPerUnit * numberOfUnits * 12;
    const effectiveGrossIncome = grossRentalIncome * (1 - vacancyRate / 100);

    // Expenses
    const pmFee = isDIY ? 0 : effectiveGrossIncome * (propertyManagementFee / 100);
    const monthlyOptional = (hoa + sewer + water) * numberOfUnits;
    const annualOptional = monthlyOptional * 12;
    const lawnAnnual = lawnCare * 7; // 7 months/year
    const totalOperatingExpenses = propertyTaxes + insurance + maintenanceCapex + pmFee +
      annualOptional + lawnAnnual + tenantPlacementFee + leaseRenewalFee + annualTuneupFee;

    const netOperatingIncome = effectiveGrossIncome - totalOperatingExpenses;

    const rate = interestRate / 100;
    const monthlyMortgage = loanAmount > 0 && loanTerm > 0 ? pmtCalc(rate, loanTerm, loanAmount) : 0;
    const annualDebtService = monthlyMortgage * 12;
    const annualCashFlow = netOperatingIncome - annualDebtService;
    const monthlyCashFlow = annualCashFlow / 12;
    const cashInvested = downPaymentAmount + improvements + closingCosts;
    const cashOnCashROI = safeNum(cashInvested > 0 ? (annualCashFlow / cashInvested) * 100 : 0);
    const capRate = safeNum(purchasePrice > 0 ? (netOperatingIncome / purchasePrice) * 100 : 0);
    const principalPaid = loanAmount > 0 ? principalYear1(rate, loanAmount, monthlyMortgage) : 0;
    const totalROI = safeNum(cashInvested > 0 ? ((annualCashFlow + principalPaid) / cashInvested) * 100 : 0);

    let dealRating: CalculatorOutputs['dealRating'];
    let dealRatingColor: string;
    if (cashOnCashROI >= 8) { dealRating = 'Excellent'; dealRatingColor = 'success'; }
    else if (cashOnCashROI >= 5) { dealRating = 'Good'; dealRatingColor = 'success'; }
    else if (cashOnCashROI >= 0) { dealRating = 'Marginal'; dealRatingColor = 'warning'; }
    else { dealRating = 'Negative'; dealRatingColor = 'destructive'; }

    // Donut chart
    const donutCashFlow = Math.max(annualCashFlow, 1);
    const donutDebt = Math.max(annualDebtService, 1);
    const donutExpenses = Math.max(totalOperatingExpenses, 1);
    const donutData = [
      { name: 'Net Cash Flow', value: donutCashFlow, color: 'hsl(var(--chart-green))' },
      { name: 'Debt Service', value: donutDebt, color: 'hsl(var(--chart-indigo))' },
      { name: 'Operating Expenses', value: donutExpenses, color: 'hsl(var(--chart-amber))' },
    ];

    // Equity over time
    const equityData: CalculatorOutputs['equityData'] = [];
    let eqBalance = loanAmount;
    const eqMonthlyRate = rate / 12;
    for (let y = 0; y <= loanTerm; y++) {
      const propVal = purchasePrice * Math.pow(1 + appreciationRate / 100, y);
      const equity = propVal - eqBalance;
      equityData.push({ year: y, equity, propertyValue: propVal, remainingDebt: eqBalance });
      if (y < loanTerm) {
        for (let m = 0; m < 12; m++) {
          if (eqBalance <= 0) break;
          const interest = eqBalance * eqMonthlyRate;
          const principal = Math.min(monthlyMortgage - interest, eqBalance);
          eqBalance -= principal;
        }
      }
    }

    // Cash flow projection 10 years
    const cashFlowProjection: CalculatorOutputs['cashFlowProjection'] = [];
    for (let y = 1; y <= 10; y++) {
      const rentMult = Math.pow(1 + annualRentIncrease / 100, y - 1);
      const expMult = Math.pow(1 + annualExpenseIncrease / 100, y - 1);
      const yEGI = effectiveGrossIncome * rentMult;
      const yPM = isDIY ? 0 : yEGI * (propertyManagementFee / 100);
      const yExpBase = (propertyTaxes + insurance + maintenanceCapex + annualOptional + lawnAnnual +
        tenantPlacementFee + leaseRenewalFee + annualTuneupFee) * expMult;
      const yExp = yExpBase + yPM;
      const yNOI = yEGI - yExp;
      const yCF = yNOI - annualDebtService;
      cashFlowProjection.push({ year: y, cashFlow: yCF });
    }

    // Amortization schedule
    const amortizationData = loanAmount > 0 ? getAmortizationSchedule(rate, loanAmount, monthlyMortgage, loanTerm) : [];

    // ROI comparison 10 years
    const roiComparison: CalculatorOutputs['roiComparison'] = [];
    let cumCashFlow = 0;
    let roiBalance = loanAmount;
    for (let y = 1; y <= 10; y++) {
      const cfEntry = cashFlowProjection.find(c => c.year === y);
      cumCashFlow += cfEntry?.cashFlow ?? 0;
      // Principal paid in year y
      let yearPrincipal = 0;
      for (let m = 0; m < 12; m++) {
        if (roiBalance <= 0) break;
        const interest = roiBalance * eqMonthlyRate;
        const principal = Math.min(monthlyMortgage - interest, roiBalance);
        yearPrincipal += principal;
        roiBalance -= principal;
      }
      const propVal = purchasePrice * Math.pow(1 + appreciationRate / 100, y);
      const appGain = propVal - purchasePrice;
      const cocROI = safeNum(cashInvested > 0 ? (cumCashFlow / cashInvested) * 100 : 0);
      const cumPrincipal = loanAmount - roiBalance;
      const tROI = safeNum(cashInvested > 0 ? ((cumCashFlow + cumPrincipal + appGain) / cashInvested) * 100 : 0);
      roiComparison.push({ year: y, cocROI, totalROI: tROI });
    }

    return {
      grossRentalIncome, effectiveGrossIncome, totalOperatingExpenses, netOperatingIncome,
      monthlyMortgage, annualDebtService, annualCashFlow, monthlyCashFlow, cashInvested,
      cashOnCashROI, capRate, principalPaidYear1: principalPaid, totalROI,
      dealRating, dealRatingColor, loanAmount, downPaymentAmount,
      equityData, cashFlowProjection, amortizationData, roiComparison, donutData,
    };
  }, [state]);

  return { state, outputs, updateField, loadState, resetState };
}
