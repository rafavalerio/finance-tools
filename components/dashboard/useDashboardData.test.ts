import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDashboardData } from './useDashboardData'
import { MortgageInputs } from '@/types/mortgage'

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

beforeEach(() => {
  localStorage.clear()
})

describe('useDashboardData', () => {
  it('returns no mortgage results when nothing has been saved, and no longer exposes members', async () => {
    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.mortgageResults).toBeNull())
    expect(result.current).not.toHaveProperty('members')
  })

  it('computes mortgage results from saved inputs, once loan details exist', async () => {
    localStorage.setItem('finance-tools-mortgage-inputs', JSON.stringify(savedInputs))

    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.mortgageResults).not.toBeNull())
    expect(result.current.mortgageResults!.monthlyMortgagePayment).toBeGreaterThan(0)
  })

  it('computes mortgage results using saved household members for the split', async () => {
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
    localStorage.setItem('finance-tools-mortgage-inputs', JSON.stringify(savedInputs))

    const { result } = renderHook(() => useDashboardData())
    // Wait on the final split-aware result directly, not just "not null" — household members
    // load asynchronously and independently of the mortgage data, so an intermediate render can
    // already have non-null mortgageResults computed from a still-empty members list.
    await waitFor(() => expect(result.current.mortgageResults?.splitBreakdown).toHaveLength(2))
  })

  it('leaves mortgage results null when saved inputs have no loan amount', async () => {
    localStorage.setItem(
      'finance-tools-mortgage-inputs',
      JSON.stringify({ ...savedInputs, loanAmount: 0 }),
    )
    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.mortgageResults).toBeNull())
  })
})

describe('useDashboardData budget', () => {
  it('returns a null budget summary when nothing has been saved', async () => {
    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.mortgageResults).toBeNull())
    expect(result.current.budgetSummary).toBeNull()
    expect(result.current.topCategories).toEqual([])
  })

  it('summarises saved budget expenses and returns the top three categories', async () => {
    localStorage.setItem(
      'finance-tools-budget-expenses',
      JSON.stringify([
        { id: '1', name: 'Power', amount: 180, frequency: 'monthly', category: 'utilities' },
        { id: '2', name: 'Rates', amount: 300, frequency: 'quarterly', category: 'housing' },
        { id: '3', name: 'Car', amount: 400, frequency: 'monthly', category: 'transport' },
        { id: '4', name: 'Gym', amount: 50, frequency: 'monthly', category: 'health' },
      ]),
    )
    localStorage.setItem('finance-tools-budget-take-home', JSON.stringify(5000))

    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.budgetSummary).not.toBeNull())
    expect(result.current.budgetSummary!.monthlyExpenses).toBeCloseTo(180 + 100 + 400 + 50)
    expect(result.current.budgetSummary!.surplus).toBeCloseTo(5000 - 730)
    expect(result.current.topCategories).toHaveLength(3)
    expect(result.current.topCategories[0].name).toBe('Transport')
  })

  it('migrates legacy mortgage expenses on the dashboard, the likeliest first surface after deploy', async () => {
    localStorage.setItem(
      'finance-tools-mortgage-expenses',
      JSON.stringify([
        { id: 'x', name: 'Rates', amount: 300, frequency: 'quarterly' },
        { id: 'y', name: 'Power', amount: 180, frequency: 'monthly' },
      ]),
    )

    const { result } = renderHook(() => useDashboardData())

    await waitFor(() => expect(result.current.budgetSummary).not.toBeNull())
    expect(result.current.budgetSummary!.monthlyExpenses).toBeCloseTo(100 + 180)
    // Everything imported lands in "Other", and the legacy key is gone afterwards.
    expect(result.current.topCategories.map((category) => category.name)).toEqual(['Other'])
    expect(localStorage.getItem('finance-tools-mortgage-expenses')).toBeNull()
    expect(JSON.parse(localStorage.getItem('finance-tools-budget-expenses')!)).toHaveLength(2)
  })
})
