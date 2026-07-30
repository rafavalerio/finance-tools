import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useBudgetPlanner } from './useBudgetPlanner'
import { MortgageInputs } from '@/types/mortgage'
import { Expense } from '@/types/budget'

const savedInputs: MortgageInputs = {
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

const expenses: Expense[] = [
  { id: '1', name: 'Power', amount: 180, frequency: 'monthly', category: 'utilities' },
]

beforeEach(() => {
  localStorage.clear()
})

describe('useBudgetPlanner', () => {
  it('starts empty when nothing has been saved', async () => {
    const { result } = renderHook(() => useBudgetPlanner())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.expenses).toEqual([])
    expect(result.current.takeHomeOverride).toBeNull()
    expect(result.current.mortgageMonthly).toBe(0)
    expect(result.current.hasMembers).toBe(false)
  })

  it('loads saved expenses and take-home override', async () => {
    localStorage.setItem('finance-tools-budget-expenses', JSON.stringify(expenses))
    localStorage.setItem('finance-tools-budget-take-home', JSON.stringify(9000))

    const { result } = renderHook(() => useBudgetPlanner())
    await waitFor(() => expect(result.current.expenses).toHaveLength(1))
    expect(result.current.takeHomeOverride).toBe(9000)
    expect(result.current.summary.monthlyIncome).toBe(9000)
  })

  it('pulls the monthly repayment from saved mortgage data', async () => {
    localStorage.setItem('finance-tools-mortgage-inputs', JSON.stringify(savedInputs))
    const { result } = renderHook(() => useBudgetPlanner())
    await waitFor(() => expect(result.current.mortgageMonthly).toBeGreaterThan(0))
    expect(result.current.summary.monthlyExpenses).toBeCloseTo(result.current.mortgageMonthly)
  })

  it('includes the mortgage in the breakdown data', async () => {
    localStorage.setItem('finance-tools-mortgage-inputs', JSON.stringify(savedInputs))
    localStorage.setItem('finance-tools-budget-expenses', JSON.stringify(expenses))

    const { result } = renderHook(() => useBudgetPlanner())
    await waitFor(() => expect(result.current.breakdownData.length).toBeGreaterThan(1))
    expect(result.current.breakdownData[0].name).toBe('Mortgage')
    expect(result.current.breakdownData.some((item) => item.name === 'Utilities')).toBe(true)
  })

  it('persists expense edits', async () => {
    const { result } = renderHook(() => useBudgetPlanner())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    act(() => result.current.setExpenses(expenses))

    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('finance-tools-budget-expenses')!)).toHaveLength(1),
    )
  })

  it('persists a take-home override and clears it again', async () => {
    const { result } = renderHook(() => useBudgetPlanner())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    act(() => result.current.setTakeHomeOverride(9000))
    await waitFor(() => expect(localStorage.getItem('finance-tools-budget-take-home')).toBe('9000'))

    act(() => result.current.setTakeHomeOverride(null))
    await waitFor(() => expect(localStorage.getItem('finance-tools-budget-take-home')).toBeNull())
  })

  it('computes member shares from the household split config', async () => {
    localStorage.setItem(
      'finance-tools-household',
      JSON.stringify([
        { id: 'a', name: 'Alex', income: 100000 },
        { id: 'b', name: 'Sam', income: 50000 },
      ]),
    )
    localStorage.setItem(
      'finance-tools-household-split',
      JSON.stringify({ memberIds: ['a', 'b'], mode: 'even' }),
    )
    localStorage.setItem('finance-tools-budget-expenses', JSON.stringify(expenses))

    const { result } = renderHook(() => useBudgetPlanner())
    await waitFor(() => expect(result.current.memberShares).toHaveLength(2))
    expect(result.current.hasMembers).toBe(true)
    expect(result.current.memberShares[0].share).toBeCloseTo(90)
  })

  it('migrates legacy mortgage expenses on first load', async () => {
    localStorage.setItem(
      'finance-tools-mortgage-expenses',
      JSON.stringify([{ id: 'x', name: 'Rates', amount: 300, frequency: 'quarterly' }]),
    )

    const { result } = renderHook(() => useBudgetPlanner())
    await waitFor(() => expect(result.current.expenses).toHaveLength(1))
    expect(result.current.expenses[0]).toMatchObject({ name: 'Rates', category: 'other' })
    expect(localStorage.getItem('finance-tools-mortgage-expenses')).toBeNull()
  })
})
