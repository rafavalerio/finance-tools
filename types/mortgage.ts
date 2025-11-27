export type RepaymentFrequency = "weekly" | "fortnightly" | "monthly";

export type ExpenseFrequency = "monthly" | "quarterly" | "annually";

export type BuyerType = "standard" | "first_home_buyer" | "foreign_buyer";

export interface MortgageInputs {
  loanAmount: number;
  deposit: number;
  interestRate: number;
  loanTermYears: number;
  repaymentFrequency: RepaymentFrequency;
  offsetBalance: number;
  buyerType: BuyerType;
  includeLegalFees: boolean;
  includeBuildingInspection: boolean;
}

export interface PurchaseCosts {
  stampDuty: number;
  stampDutyDescription: string;
  legalFees: number;
  titleRegistration: number;
  buildingInspection: number;
  mortgageRegistration: number;
  totalCosts: number;
  effectiveDeposit: number;
  depositPercentage: number;
  requiresLMI: boolean;
  estimatedLMI: number;
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  frequency: ExpenseFrequency;
}

export interface AmortisationDataPoint {
  period: number;
  date: string;
  balance: number;
  principal: number;
  interest: number;
  payment: number;
}

export interface MortgageResults {
  // Loan details
  principalAmount: number;
  repaymentAmount: number;
  repaymentFrequency: RepaymentFrequency;
  totalRepayments: number;
  totalInterest: number;
  payoffDate: Date;
  
  // Monthly equivalents
  monthlyMortgagePayment: number;
  monthlyExpensesTotal: number;
  totalMonthlyOutgoing: number;
  perPersonAmount: number;
  
  // Amortisation schedule
  amortisationSchedule: AmortisationDataPoint[];
}

export interface ExpenseBreakdownItem {
  name: string;
  value: number;
  color: string;
}

