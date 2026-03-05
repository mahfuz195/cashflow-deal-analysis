export interface CalculatorState {
  // Purchase Details
  purchasePrice: number;
  improvements: number;
  closingCosts: number;

  // Financing
  downPaymentPercent: number;
  interestRate: number;
  loanTerm: number;

  // Income
  rentPerUnit: number;
  numberOfUnits: number;
  vacancyRate: number;
  annualRentIncrease: number;

  // Expenses - Standard
  propertyTaxes: number;
  insurance: number;
  maintenanceCapex: number;
  propertyManagementFee: number;

  // Expenses - Optional
  hoa: number;
  sewer: number;
  water: number;
  lawnCare: number;
  tenantPlacementFee: number;
  leaseRenewalFee: number;
  annualTuneupFee: number;
  annualExpenseIncrease: number;

  // Settings
  appreciationRate: number;
  isDIY: boolean;
}

export interface CalculatorOutputs {
  grossRentalIncome: number;
  effectiveGrossIncome: number;
  totalOperatingExpenses: number;
  netOperatingIncome: number;
  monthlyMortgage: number;
  annualDebtService: number;
  annualCashFlow: number;
  monthlyCashFlow: number;
  cashInvested: number;
  cashOnCashROI: number;
  capRate: number;
  principalPaidYear1: number;
  totalROI: number;
  dealRating: 'Excellent' | 'Good' | 'Marginal' | 'Negative';
  dealRatingColor: string;
  loanAmount: number;
  downPaymentAmount: number;

  // Chart data
  equityData: { year: number; equity: number; propertyValue: number; remainingDebt: number }[];
  cashFlowProjection: { year: number; cashFlow: number }[];
  amortizationData: { year: number; principal: number; interest: number }[];
  roiComparison: { year: number; cocROI: number; totalROI: number }[];
  donutData: { name: string; value: number; color: string }[];
}

export interface SavedCalculation {
  id: string;
  name: string;
  savedAt: string;
  state: CalculatorState;
  summary: {
    purchasePrice: number;
    monthlyCashFlow: number;
    cocROI: number;
    dealRating: string;
  };
}

export const defaultState: CalculatorState = {
  purchasePrice: 200000,
  improvements: 0,
  closingCosts: 10000,
  downPaymentPercent: 20,
  interestRate: 6.89,
  loanTerm: 30,
  rentPerUnit: 1500,
  numberOfUnits: 1,
  vacancyRate: 5,
  annualRentIncrease: 2,
  propertyTaxes: 2400,
  insurance: 1200,
  maintenanceCapex: 2000,
  propertyManagementFee: 8,
  hoa: 0,
  sewer: 0,
  water: 0,
  lawnCare: 0,
  tenantPlacementFee: 0,
  leaseRenewalFee: 0,
  annualTuneupFee: 0,
  annualExpenseIncrease: 2,
  appreciationRate: 3,
  isDIY: false,
};
