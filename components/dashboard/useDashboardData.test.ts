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
    localStorage.setItem('finance-tools-mortgage-expenses', JSON.stringify([]))

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
    localStorage.setItem('finance-tools-mortgage-expenses', JSON.stringify([]))

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
