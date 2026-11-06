import { describe, it, expect } from 'vitest'
import {
  getRepaymentsPerYear,
  convertRepaymentToMonthly,
  calculateRepayment,
  generateAmortisationSchedule,
  calculateMortgageResults,
  calculateSavedMortgageResults,
  formatFrequencyLabel,
  estimateLMI,
  calculatePurchaseCosts,
} from './mortgage'
import { MortgageInputs } from '@/types/mortgage'

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

describe('getRepaymentsPerYear', () => {
  it('returns the correct count per frequency', () => {
    expect(getRepaymentsPerYear('weekly')).toBe(52)
    expect(getRepaymentsPerYear('fortnightly')).toBe(26)
    expect(getRepaymentsPerYear('monthly')).toBe(12)
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
  it('derives principal as loan amount minus deposit', () => {
    const results = calculateMortgageResults(baseInputs)
    expect(results.principalAmount).toBe(500000)
  })

  it('reduces the effective principal by the offset balance', () => {
    const withOffset = calculateMortgageResults({ ...baseInputs, offsetBalance: 50000 })
    const withoutOffset = calculateMortgageResults(baseInputs)
    expect(withOffset.repaymentAmount).toBeLessThan(withoutOffset.repaymentAmount)
  })

  it('produces an amortisation schedule', () => {
    const results = calculateMortgageResults(baseInputs)
    expect(results.amortisationSchedule.length).toBeGreaterThan(0)
  })
})

describe('calculateSavedMortgageResults', () => {
  it('returns null when the loan amount is zero', () => {
    expect(calculateSavedMortgageResults({ ...baseInputs, loanAmount: 0 })).toBeNull()
  })

  it('returns null when the interest rate is zero', () => {
    expect(
      calculateSavedMortgageResults({ ...baseInputs, interestRate: 0 }),
    ).toBeNull()
  })

  it('returns results when the inputs are complete', () => {
    const results = calculateSavedMortgageResults(baseInputs)
    expect(results).not.toBeNull()
    expect(results!.monthlyMortgagePayment).toBeGreaterThan(0)
  })

  it('reduces the deposit by purchase costs, raising the repayment', () => {
    const withDeposit = { ...baseInputs, deposit: 100000 }
    const adjusted = calculateSavedMortgageResults(withDeposit)!
    const unadjusted = calculateMortgageResults(withDeposit)
    expect(adjusted.monthlyMortgagePayment).toBeGreaterThan(unadjusted.monthlyMortgagePayment)
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
