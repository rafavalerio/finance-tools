import {
  MortgageInputs,
  MortgageResults,
  Expense,
  ExpenseFrequency,
  RepaymentFrequency,
  AmortisationDataPoint,
  BuyerType,
  AustralianState,
  PurchaseCosts,
  MemberSplitAmount,
} from '@/types/mortgage'
import { HouseholdMember, HouseholdSplitConfig } from '@/types/household'
import { computeSplit } from './household'
import { calculateStampDuty } from './stampDuty/engine'
import { STAMP_DUTY_TABLE } from './stampDuty/data'

/**
 * Get the number of repayments per year based on frequency
 */
export function getRepaymentsPerYear(frequency: RepaymentFrequency): number {
  switch (frequency) {
    case 'weekly':
      return 52
    case 'fortnightly':
      return 26
    case 'monthly':
      return 12
  }
}

/**
 * Convert an expense amount to its monthly equivalent
 */
export function convertToMonthly(amount: number, frequency: ExpenseFrequency): number {
  switch (frequency) {
    case 'monthly':
      return amount
    case 'quarterly':
      return amount / 3
    case 'annually':
      return amount / 12
  }
}

/**
 * Convert a repayment amount to its monthly equivalent
 */
export function convertRepaymentToMonthly(amount: number, frequency: RepaymentFrequency): number {
  const repaymentsPerYear = getRepaymentsPerYear(frequency)
  return (amount * repaymentsPerYear) / 12
}

/**
 * Calculate the periodic mortgage repayment amount
 * Uses the standard amortisation formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
 * where:
 * - M = periodic payment
 * - P = principal (loan amount minus offset)
 * - r = periodic interest rate
 * - n = total number of payments
 */
export function calculateRepayment(
  principal: number,
  annualInterestRate: number,
  loanTermYears: number,
  frequency: RepaymentFrequency,
): number {
  if (principal <= 0) return 0
  if (annualInterestRate <= 0) {
    // No interest - simple division
    const totalPayments = loanTermYears * getRepaymentsPerYear(frequency)
    return principal / totalPayments
  }

  const periodsPerYear = getRepaymentsPerYear(frequency)
  const periodicRate = annualInterestRate / 100 / periodsPerYear
  const totalPayments = loanTermYears * periodsPerYear

  const numerator = periodicRate * Math.pow(1 + periodicRate, totalPayments)
  const denominator = Math.pow(1 + periodicRate, totalPayments) - 1

  return principal * (numerator / denominator)
}

/**
 * Generate the amortisation schedule showing balance over time
 */
export function generateAmortisationSchedule(
  principal: number,
  annualInterestRate: number,
  loanTermYears: number,
  frequency: RepaymentFrequency,
  repaymentAmount: number,
): AmortisationDataPoint[] {
  const schedule: AmortisationDataPoint[] = []
  const periodsPerYear = getRepaymentsPerYear(frequency)
  const periodicRate = annualInterestRate / 100 / periodsPerYear
  const totalPayments = loanTermYears * periodsPerYear

  let balance = principal
  const startDate = new Date()

  // For display purposes, we'll sample the schedule (every month for monthly, every 4 weeks for weekly, etc.)
  const samplingInterval = frequency === 'weekly' ? 4 : frequency === 'fortnightly' ? 2 : 1

  for (let period = 0; period <= totalPayments; period++) {
    if (period % samplingInterval === 0 || period === totalPayments) {
      const date = new Date(startDate)

      if (frequency === 'weekly') {
        date.setDate(date.getDate() + period * 7)
      } else if (frequency === 'fortnightly') {
        date.setDate(date.getDate() + period * 14)
      } else {
        date.setMonth(date.getMonth() + period)
      }

      schedule.push({
        period,
        date: date.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' }),
        balance: Math.max(0, balance),
        principal: 0,
        interest: 0,
        payment: period === 0 ? 0 : repaymentAmount,
      })
    }

    if (period < totalPayments && balance > 0) {
      const interestPayment = balance * periodicRate
      const principalPayment = Math.min(repaymentAmount - interestPayment, balance)
      balance -= principalPayment
    }
  }

  return schedule
}

/**
 * Calculate all mortgage results
 */
export function calculateMortgageResults(
  inputs: MortgageInputs,
  expenses: Expense[],
  members: HouseholdMember[],
  splitConfig: HouseholdSplitConfig,
): MortgageResults {
  // Calculate principal (loan amount minus deposit)
  const principalAmount = inputs.loanAmount - inputs.deposit

  // Effective principal considering offset
  const effectivePrincipal = Math.max(0, principalAmount - inputs.offsetBalance)

  // Calculate repayment amount
  const repaymentAmount = calculateRepayment(
    effectivePrincipal,
    inputs.interestRate,
    inputs.loanTermYears,
    inputs.repaymentFrequency,
  )

  // Calculate total repayments and interest
  const periodsPerYear = getRepaymentsPerYear(inputs.repaymentFrequency)
  const totalPayments = inputs.loanTermYears * periodsPerYear
  const totalRepayments = repaymentAmount * totalPayments
  const totalInterest = totalRepayments - effectivePrincipal

  // Calculate payoff date
  const payoffDate = new Date()
  payoffDate.setFullYear(payoffDate.getFullYear() + inputs.loanTermYears)

  // Convert mortgage repayment to monthly equivalent
  const monthlyMortgagePayment = convertRepaymentToMonthly(
    repaymentAmount,
    inputs.repaymentFrequency,
  )

  // Calculate monthly expenses total
  const monthlyExpensesTotal = expenses.reduce((total, expense) => {
    return total + convertToMonthly(expense.amount, expense.frequency)
  }, 0)

  // Calculate totals
  const totalMonthlyOutgoing = monthlyMortgagePayment + monthlyExpensesTotal

  // Split the total across the selected household members (empty if fewer than 2)
  const splitMembers = members.filter((member) => splitConfig.memberIds.includes(member.id))
  let splitBreakdown: MemberSplitAmount[] = []
  if (splitMembers.length >= 2) {
    const ratios = computeSplit(splitMembers, splitConfig.mode)
    splitBreakdown = splitMembers.map((member) => ({
      memberId: member.id,
      name: member.name,
      amount: totalMonthlyOutgoing * ratios[member.id],
    }))
  }

  // Generate amortisation schedule
  const amortisationSchedule = generateAmortisationSchedule(
    effectivePrincipal,
    inputs.interestRate,
    inputs.loanTermYears,
    inputs.repaymentFrequency,
    repaymentAmount,
  )

  return {
    principalAmount,
    repaymentAmount,
    repaymentFrequency: inputs.repaymentFrequency,
    totalRepayments,
    totalInterest,
    payoffDate,
    monthlyMortgagePayment,
    monthlyExpensesTotal,
    totalMonthlyOutgoing,
    splitBreakdown,
    amortisationSchedule,
  }
}

/**
 * Format frequency label
 */
export function formatFrequencyLabel(frequency: RepaymentFrequency): string {
  switch (frequency) {
    case 'weekly':
      return 'per week'
    case 'fortnightly':
      return 'per fortnight'
    case 'monthly':
      return 'per month'
  }
}

/**
 * Estimate Lenders Mortgage Insurance (LMI)
 * LMI is typically required when deposit is less than 20%
 * This is an approximation - actual LMI varies by lender
 */
export function estimateLMI(propertyPrice: number, deposit: number, loanAmount: number): number {
  const lvr = (loanAmount / propertyPrice) * 100

  // No LMI required if LVR is 80% or less
  if (lvr <= 80) return 0

  // LMI rates vary significantly, this is an approximation
  // Based on typical LMI premium rates
  let lmiRate = 0

  if (lvr <= 85) {
    lmiRate = 0.0052 // ~0.52% of loan amount
  } else if (lvr <= 90) {
    lmiRate = 0.0154 // ~1.54% of loan amount
  } else if (lvr <= 95) {
    lmiRate = 0.035 // ~3.5% of loan amount
  } else {
    lmiRate = 0.045 // ~4.5% of loan amount (rare, most lenders cap at 95%)
  }

  return Math.round(loanAmount * lmiRate)
}

/**
 * Calculate all purchase costs for a property purchase in the given state
 */
export function calculatePurchaseCosts(
  propertyPrice: number,
  deposit: number,
  state: AustralianState,
  buyerType: BuyerType,
  includeLegalFees: boolean,
  includeBuildingInspection: boolean,
): PurchaseCosts {
  const loanAmount = propertyPrice - deposit

  // Stamp duty
  const stampDutyResult = calculateStampDuty(state, propertyPrice, buyerType)
  const stateConfig = STAMP_DUTY_TABLE[state]

  // Legal/Conveyancing fees (typical range $1,500 - $3,000)
  const legalFees = includeLegalFees ? 2000 : 0

  // Title search and registration
  const titleRegistration = stateConfig.titleRegistrationFee

  // Building and pest inspection (~$500 - $800)
  const buildingInspection = includeBuildingInspection ? 650 : 0

  // Mortgage registration fee
  const mortgageRegistration = stateConfig.mortgageRegistrationFee

  // Calculate LMI if applicable
  const estimatedLMI = estimateLMI(propertyPrice, deposit, loanAmount)

  // Total upfront costs (excluding LMI which is usually capitalised)
  const totalCosts =
    stampDutyResult.amount +
    legalFees +
    titleRegistration +
    buildingInspection +
    mortgageRegistration

  // Effective deposit after costs
  const effectiveDeposit = deposit - totalCosts

  // Deposit percentage of property price
  const depositPercentage = (effectiveDeposit / propertyPrice) * 100

  // LMI is required if effective LVR > 80%
  const effectiveLVR = ((propertyPrice - effectiveDeposit) / propertyPrice) * 100
  const requiresLMI = effectiveLVR > 80

  return {
    stampDuty: stampDutyResult.amount,
    stampDutyDescription: stampDutyResult.description,
    legalFees,
    titleRegistration,
    buildingInspection,
    mortgageRegistration,
    totalCosts,
    effectiveDeposit: Math.max(0, effectiveDeposit),
    depositPercentage: Math.max(0, depositPercentage),
    requiresLMI,
    estimatedLMI: requiresLMI ? estimatedLMI : 0,
  }
}
