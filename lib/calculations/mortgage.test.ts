import { describe, it, expect } from 'vitest'
import {
  getRepaymentsPerYear,
  convertToMonthly,
  convertRepaymentToMonthly,
  calculateRepayment,
  generateAmortisationSchedule,
  calculateMortgageResults,
  formatFrequencyLabel,
  estimateLMI,
  calculatePurchaseCosts,
} from './mortgage'
import { Expense, MortgageInputs } from '@/types/mortgage'
import { HouseholdMember } from '@/types/household'

describe('getRepaymentsPerYear', () => {
  it('returns the correct count per frequency', () => {
    expect(getRepaymentsPerYear('weekly')).toBe(52)
    expect(getRepaymentsPerYear('fortnightly')).toBe(26)
    expect(getRepaymentsPerYear('monthly')).toBe(12)
  })
})

describe('convertToMonthly', () => {
  it('passes monthly amounts through unchanged', () => {
    expect(convertToMonthly(100, 'monthly')).toBe(100)
  })

  it('divides quarterly amounts by 3', () => {
    expect(convertToMonthly(300, 'quarterly')).toBe(100)
  })

  it('divides annual amounts by 12', () => {
    expect(convertToMonthly(1200, 'annually')).toBe(100)
  })
})

describe('convertRepaymentToMonthly', () => {
  it('converts a weekly repayment to its monthly equivalent', () => {
    expect(convertRepaymentToMonthly(100, 'weekly')).toBeCloseTo((100 * 52) / 12)
  })

  it('converts a fortnightly repayment to its monthly equivalent', () => {
    expect(convertRepaymentToMonthly(100, 'fortnightly')).toBeCloseTo((100 * 26) / 12)
  })

  it('leaves a monthly repayment unchanged', () => {
    expect(convertRepaymentToMonthly(100, 'monthly')).toBeCloseTo(100)
  })
})

describe('calculateRepayment', () => {
  it('returns 0 for a non-positive principal', () => {
    expect(calculateRepayment(0, 6, 30, 'monthly')).toBe(0)
    expect(calculateRepayment(-100, 6, 30, 'monthly')).toBe(0)
  })

  it('divides evenly when the interest rate is 0', () => {
    const result = calculateRepayment(12000, 0, 1, 'monthly')
    expect(result).toBeCloseTo(1000)
  })

  it('applies the standard amortisation formula for a positive rate', () => {
    // Known reference: $500,000 principal, 6% p.a., 30 years, monthly ~= $2,997.75
    const result = calculateRepayment(500000, 6, 30, 'monthly')
    expect(result).toBeCloseTo(2997.75, 1)
  })
})

describe('generateAmortisationSchedule', () => {
  it('starts at the full principal and ends at (or near) zero', () => {
    const repayment = calculateRepayment(100000, 5, 10, 'monthly')
    const schedule = generateAmortisationSchedule(100000, 5, 10, 'monthly', repayment)

    expect(schedule[0].balance).toBe(100000)
    expect(schedule[0].period).toBe(0)
    expect(schedule[schedule.length - 1].balance).toBeCloseTo(0, 0)
  })

  it('never lets the balance go negative', () => {
    const repayment = calculateRepayment(10000, 3, 1, 'monthly')
    const schedule = generateAmortisationSchedule(10000, 3, 1, 'monthly', repayment)

    for (const point of schedule) {
      expect(point.balance).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('calculateMortgageResults', () => {
  const baseInputs: MortgageInputs = {
    loanAmount: 600000,
    deposit: 100000,
    interestRate: 6,
    loanTermYears: 30,
    repaymentFrequency: 'monthly',
    offsetBalance: 0,
    buyerType: 'standard',
    state: 'VIC',
    includeLegalFees: true,
    includeBuildingInspection: true,
  }
  const noSplit = { memberIds: [], mode: 'even' as const }

  it('derives principal as loan amount minus deposit', () => {
    const results = calculateMortgageResults(baseInputs, [], [], noSplit)
    expect(results.principalAmount).toBe(500000)
  })

  it('reduces the effective principal by the offset balance', () => {
    const withOffset = calculateMortgageResults(
      { ...baseInputs, offsetBalance: 50000 },
      [],
      [],
      noSplit,
    )
    const withoutOffset = calculateMortgageResults(baseInputs, [], [], noSplit)
    expect(withOffset.repaymentAmount).toBeLessThan(withoutOffset.repaymentAmount)
  })

  it('sums monthly expenses onto the mortgage payment', () => {
    const expenses: Expense[] = [
      { id: '1', name: 'Rates', amount: 300, frequency: 'quarterly' },
      { id: '2', name: 'Insurance', amount: 1200, frequency: 'annually' },
    ]
    const results = calculateMortgageResults(baseInputs, expenses, [], noSplit)

    expect(results.monthlyExpensesTotal).toBeCloseTo(100 + 100)
    expect(results.totalMonthlyOutgoing).toBeCloseTo(
      results.monthlyMortgagePayment + results.monthlyExpensesTotal,
    )
  })

  it('produces no split breakdown when fewer than two members are selected', () => {
    const members: HouseholdMember[] = [{ id: 'a', name: 'Alex', income: 100000 }]
    const results = calculateMortgageResults(baseInputs, [], members, {
      memberIds: ['a'],
      mode: 'even',
    })
    expect(results.splitBreakdown).toEqual([])
  })

  it('splits the total monthly outgoing evenly across selected members', () => {
    const members: HouseholdMember[] = [
      { id: 'a', name: 'Alex', income: 100000 },
      { id: 'b', name: 'Sam', income: 50000 },
    ]
    const results = calculateMortgageResults(baseInputs, [], members, {
      memberIds: ['a', 'b'],
      mode: 'even',
    })
    expect(results.splitBreakdown).toHaveLength(2)
    expect(results.splitBreakdown[0].amount).toBeCloseTo(results.totalMonthlyOutgoing / 2)
    expect(results.splitBreakdown[1].amount).toBeCloseTo(results.totalMonthlyOutgoing / 2)
  })

  it('splits the total monthly outgoing by income when mode is income', () => {
    const members: HouseholdMember[] = [
      { id: 'a', name: 'Alex', income: 100000 },
      { id: 'b', name: 'Sam', income: 50000 },
    ]
    const results = calculateMortgageResults(baseInputs, [], members, {
      memberIds: ['a', 'b'],
      mode: 'income',
    })
    const alex = results.splitBreakdown.find((entry) => entry.memberId === 'a')!
    const sam = results.splitBreakdown.find((entry) => entry.memberId === 'b')!
    expect(alex.amount).toBeCloseTo(results.totalMonthlyOutgoing * (2 / 3))
    expect(sam.amount).toBeCloseTo(results.totalMonthlyOutgoing * (1 / 3))
  })

  it('produces an amortisation schedule', () => {
    const results = calculateMortgageResults(baseInputs, [], [], noSplit)
    expect(results.amortisationSchedule.length).toBeGreaterThan(0)
  })
})

describe('formatFrequencyLabel', () => {
  it('maps each frequency to its label', () => {
    expect(formatFrequencyLabel('weekly')).toBe('per week')
    expect(formatFrequencyLabel('fortnightly')).toBe('per fortnight')
    expect(formatFrequencyLabel('monthly')).toBe('per month')
  })
})

describe('estimateLMI', () => {
  it('requires no LMI at 80% LVR or below', () => {
    expect(estimateLMI(500000, 100000, 400000)).toBe(0)
  })

  it('estimates LMI once LVR exceeds 80%', () => {
    const lmi = estimateLMI(500000, 50000, 450000)
    expect(lmi).toBeGreaterThan(0)
  })

  it('increases the LMI rate as LVR climbs', () => {
    const lowerLvrLmi = estimateLMI(500000, 75000, 425000) // 85% LVR
    const higherLvrLmi = estimateLMI(500000, 25000, 475000) // 95% LVR
    expect(higherLvrLmi).toBeGreaterThan(lowerLvrLmi)
  })
})

describe('calculatePurchaseCosts', () => {
  it('excludes optional costs when their flags are false', () => {
    const costs = calculatePurchaseCosts(600000, 150000, 'VIC', 'standard', false, false)
    expect(costs.legalFees).toBe(0)
    expect(costs.buildingInspection).toBe(0)
  })

  it('includes optional costs when their flags are true', () => {
    const costs = calculatePurchaseCosts(600000, 150000, 'VIC', 'standard', true, true)
    expect(costs.legalFees).toBe(2000)
    expect(costs.buildingInspection).toBe(650)
  })

  it('deducts total costs from the deposit to get the effective deposit', () => {
    const costs = calculatePurchaseCosts(600000, 150000, 'VIC', 'standard', true, true)
    expect(costs.effectiveDeposit).toBeCloseTo(150000 - costs.totalCosts)
  })

  it('flags LMI as required once the effective deposit drops the LVR below 80%', () => {
    const costs = calculatePurchaseCosts(600000, 60000, 'VIC', 'standard', true, true)
    expect(costs.requiresLMI).toBe(true)
    expect(costs.estimatedLMI).toBeGreaterThan(0)
  })

  it('never lets the effective deposit go negative', () => {
    const costs = calculatePurchaseCosts(50000, 5000, 'VIC', 'standard', true, true)
    expect(costs.effectiveDeposit).toBeGreaterThanOrEqual(0)
  })

  it("uses the selected state's registration fees instead of a hardcoded Victorian value", () => {
    const vic = calculatePurchaseCosts(600000, 150000, 'VIC', 'standard', false, false)
    const nsw = calculatePurchaseCosts(600000, 150000, 'NSW', 'standard', false, false)
    expect(vic.titleRegistration).toBe(150)
    expect(vic.mortgageRegistration).toBe(120)
    expect(nsw.titleRegistration).toBe(154)
    expect(nsw.mortgageRegistration).toBe(154)
  })

  it("uses the selected state's stamp duty schedule", () => {
    const vic = calculatePurchaseCosts(600000, 150000, 'VIC', 'first_home_buyer', false, false)
    const nsw = calculatePurchaseCosts(600000, 150000, 'NSW', 'first_home_buyer', false, false)
    expect(vic.stampDuty).toBe(0) // VIC FHB exemption cap is $600,000
    expect(nsw.stampDuty).toBe(0) // NSW FHB exemption cap is $800,000
  })
})
