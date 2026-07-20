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
  includeLegalFees: true,
  includeBuildingInspection: true,
  splitMemberIds: [],
  splitMode: 'even',
}

beforeEach(() => {
  localStorage.clear()
})

describe('useDashboardData', () => {
  it('returns no mortgage results when nothing has been saved', async () => {
    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.members).toEqual([]))
    expect(result.current.mortgageResults).toBeNull()
  })

  it('returns household members loaded from the repository', async () => {
    localStorage.setItem(
      'finance-tools-household',
      JSON.stringify([{ id: '1', name: 'Rafael', income: 95000 }]),
    )
    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.members).toHaveLength(1))
  })

  it('computes mortgage results from saved inputs, once loan details exist', async () => {
    localStorage.setItem('finance-tools-mortgage-inputs', JSON.stringify(savedInputs))
    localStorage.setItem('finance-tools-mortgage-expenses', JSON.stringify([]))

    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.mortgageResults).not.toBeNull())
    expect(result.current.mortgageResults!.monthlyMortgagePayment).toBeGreaterThan(0)
  })

  it('leaves mortgage results null when saved inputs have no loan amount', async () => {
    localStorage.setItem(
      'finance-tools-mortgage-inputs',
      JSON.stringify({ ...savedInputs, loanAmount: 0 }),
    )
    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.members).toEqual([]))
    expect(result.current.mortgageResults).toBeNull()
  })
})
