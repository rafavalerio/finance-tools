import { describe, it, expect } from 'vitest'
import {
  convertToMonthly,
  computeMonthlyIncome,
  computeCategoryBreakdown,
  computeBudgetSummary,
  computeMemberBudgetShares,
  EXPENSE_CATEGORIES,
} from './budget'
import { Expense, ExpenseCategory } from '@/types/budget'
import { HouseholdMember, HouseholdSplitConfig } from '@/types/household'

const colors: Record<ExpenseCategory, string> = {
  housing: '#housing',
  utilities: '#utilities',
  insurance: '#insurance',
  transport: '#transport',
  groceries: '#groceries',
  health: '#health',
  entertainment: '#entertainment',
  other: '#other',
}
const MORTGAGE_COLOR = '#mortgage'

const expenses: Expense[] = [
  { id: '1', name: 'Rates', amount: 300, frequency: 'quarterly', category: 'housing' },
  { id: '2', name: 'Water', amount: 120, frequency: 'monthly', category: 'utilities' },
  { id: '3', name: 'Power', amount: 180, frequency: 'monthly', category: 'utilities' },
]

const members: HouseholdMember[] = [
  { id: 'a', name: 'Alex', income: 100000 },
  { id: 'b', name: 'Sam', income: 50000 },
]

const evenSplit: HouseholdSplitConfig = { memberIds: ['a', 'b'], mode: 'even' }
const incomeSplit: HouseholdSplitConfig = { memberIds: ['a', 'b'], mode: 'income' }

describe('convertToMonthly', () => {
  it('leaves monthly amounts unchanged', () => {
    expect(convertToMonthly(100, 'monthly')).toBe(100)
  })

  it('divides quarterly amounts by three', () => {
    expect(convertToMonthly(300, 'quarterly')).toBe(100)
  })

  it('divides annual amounts by twelve', () => {
    expect(convertToMonthly(1200, 'annually')).toBe(100)
  })
})

describe('EXPENSE_CATEGORIES', () => {
  it('has a label for every category', () => {
    expect(EXPENSE_CATEGORIES).toHaveLength(8)
    expect(EXPENSE_CATEGORIES.map((c) => c.value)).toContain('other')
    expect(EXPENSE_CATEGORIES.every((c) => c.label.length > 0)).toBe(true)
  })
})

describe('computeMonthlyIncome', () => {
  it('sums gross annual incomes and divides by twelve when there is no override', () => {
    expect(computeMonthlyIncome(members, null)).toBeCloseTo(150000 / 12)
  })

  it('returns the override when one is set', () => {
    expect(computeMonthlyIncome(members, 9000)).toBe(9000)
  })

  it('returns zero for an empty household with no override', () => {
    expect(computeMonthlyIncome([], null)).toBe(0)
  })

  it('honours an override of zero rather than falling back to gross', () => {
    expect(computeMonthlyIncome(members, 0)).toBe(0)
  })
})

describe('computeCategoryBreakdown', () => {
  it('groups expenses by category and sums their monthly amounts', () => {
    const result = computeCategoryBreakdown(expenses, 0, colors, MORTGAGE_COLOR)
    const utilities = result.find((item) => item.name === 'Utilities')
    expect(utilities!.value).toBeCloseTo(300)
    expect(utilities!.color).toBe('#utilities')
    const housing = result.find((item) => item.name === 'Housing')
    expect(housing!.value).toBeCloseTo(100)
  })

  it('prepends a mortgage entry when the repayment is positive', () => {
    const result = computeCategoryBreakdown(expenses, 2500, colors, MORTGAGE_COLOR)
    expect(result[0]).toEqual({ name: 'Mortgage', value: 2500, color: MORTGAGE_COLOR })
  })

  it('omits the mortgage entry when the repayment is zero', () => {
    const result = computeCategoryBreakdown(expenses, 0, colors, MORTGAGE_COLOR)
    expect(result.some((item) => item.name === 'Mortgage')).toBe(false)
  })

  it('omits categories with no positive amount and rows with no name', () => {
    const withBlanks: Expense[] = [
      ...expenses,
      { id: '4', name: '', amount: 500, frequency: 'monthly', category: 'health' },
      { id: '5', name: 'Gym', amount: 0, frequency: 'monthly', category: 'entertainment' },
    ]
    const result = computeCategoryBreakdown(withBlanks, 0, colors, MORTGAGE_COLOR)
    expect(result.map((item) => item.name).sort()).toEqual(['Housing', 'Utilities'])
  })

  it('returns an empty array when there is nothing to show', () => {
    expect(computeCategoryBreakdown([], 0, colors, MORTGAGE_COLOR)).toEqual([])
  })
})

describe('computeBudgetSummary', () => {
  it('includes the mortgage in total monthly expenses', () => {
    const summary = computeBudgetSummary(expenses, 2500, members, null)
    expect(summary.monthlyExpenses).toBeCloseTo(2500 + 100 + 120 + 180)
  })

  it('computes surplus as income minus expenses', () => {
    const summary = computeBudgetSummary(expenses, 2500, members, 9000)
    expect(summary.monthlyIncome).toBe(9000)
    expect(summary.surplus).toBeCloseTo(9000 - 2900)
  })

  it('returns a negative surplus when expenses exceed income', () => {
    const summary = computeBudgetSummary(expenses, 2500, members, 1000)
    expect(summary.surplus).toBeLessThan(0)
  })

  it('ignores expenses with no name or a non-positive amount', () => {
    const withBlanks: Expense[] = [
      ...expenses,
      { id: '4', name: '', amount: 500, frequency: 'monthly', category: 'health' },
    ]
    const summary = computeBudgetSummary(withBlanks, 0, members, null)
    expect(summary.monthlyExpenses).toBeCloseTo(400)
  })
})

describe('computeMemberBudgetShares', () => {
  it('returns an empty array when fewer than two members are selected', () => {
    expect(
      computeMemberBudgetShares(members, { memberIds: ['a'], mode: 'even' }, null, 3000),
    ).toEqual([])
    expect(computeMemberBudgetShares(members, { memberIds: [], mode: 'even' }, null, 3000)).toEqual(
      [],
    )
  })

  it('splits the total evenly in even mode', () => {
    const shares = computeMemberBudgetShares(members, evenSplit, null, 3000)
    expect(shares).toHaveLength(2)
    expect(shares[0].share).toBeCloseTo(1500)
    expect(shares[1].share).toBeCloseTo(1500)
  })

  it('splits the total by income share in income mode', () => {
    const shares = computeMemberBudgetShares(members, incomeSplit, null, 3000)
    expect(shares.find((s) => s.memberId === 'a')!.share).toBeCloseTo(2000)
    expect(shares.find((s) => s.memberId === 'b')!.share).toBeCloseTo(1000)
  })

  it('uses each member own gross income over twelve when there is no override', () => {
    const shares = computeMemberBudgetShares(members, evenSplit, null, 3000)
    expect(shares.find((s) => s.memberId === 'a')!.monthlyIncome).toBeCloseTo(100000 / 12)
    expect(shares.find((s) => s.memberId === 'b')!.monthlyIncome).toBeCloseTo(50000 / 12)
  })

  it('apportions a take-home override in proportion to gross incomes', () => {
    const shares = computeMemberBudgetShares(members, evenSplit, 9000, 3000)
    expect(shares.find((s) => s.memberId === 'a')!.monthlyIncome).toBeCloseTo(6000)
    expect(shares.find((s) => s.memberId === 'b')!.monthlyIncome).toBeCloseTo(3000)
  })

  it('splits a take-home override evenly when gross incomes sum to zero', () => {
    const zeroIncome: HouseholdMember[] = [
      { id: 'a', name: 'Alex', income: 0 },
      { id: 'b', name: 'Sam', income: 0 },
    ]
    const shares = computeMemberBudgetShares(zeroIncome, evenSplit, 4000, 3000)
    expect(shares[0].monthlyIncome).toBeCloseTo(2000)
    expect(shares[1].monthlyIncome).toBeCloseTo(2000)
  })

  it('computes leftover as monthly income minus share, and allows it to go negative', () => {
    const shares = computeMemberBudgetShares(members, evenSplit, 2000, 6000)
    const alex = shares.find((s) => s.memberId === 'a')!
    expect(alex.leftover).toBeCloseTo(alex.monthlyIncome - alex.share)
    expect(alex.leftover).toBeLessThan(0)
  })

  it('ignores members that are not in the split config', () => {
    const three: HouseholdMember[] = [...members, { id: 'c', name: 'Jo', income: 70000 }]
    const shares = computeMemberBudgetShares(three, evenSplit, null, 3000)
    expect(shares.map((s) => s.memberId)).toEqual(['a', 'b'])
  })
})
