import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useMortgageCalculator } from './useMortgageCalculator'
import { encodeMortgageData } from '@/lib/storage'
import { MortgageStorageData } from '@/lib/storage'

const mockUseSearchParams = vi.fn()

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockUseSearchParams(),
}))

beforeEach(() => {
  localStorage.clear()
  mockUseSearchParams.mockReturnValue(new URLSearchParams())
  vi.stubGlobal(
    'confirm',
    vi.fn(() => true),
  )
  Object.assign(navigator, { clipboard: { writeText: vi.fn(() => Promise.resolve()) } })
})

describe('useMortgageCalculator', () => {
  it('loads saved data from localStorage on mount', async () => {
    const saved: MortgageStorageData = {
      inputs: {
        loanAmount: 600000,
        deposit: 120000,
        interestRate: 6,
        loanTermYears: 30,
        repaymentFrequency: 'monthly',
        offsetBalance: 0,
        buyerType: 'standard',
        includeLegalFees: true,
        includeBuildingInspection: true,
      },
      expenses: [],
    }
    localStorage.setItem('finance-tools-mortgage-inputs', JSON.stringify(saved.inputs))

    const { result } = renderHook(() => useMortgageCalculator())

    await waitFor(() => expect(result.current.inputs.loanAmount).toBe(600000))
  })

  it('loads data from the URL param when present, taking priority over localStorage', async () => {
    const shared: MortgageStorageData = {
      inputs: {
        loanAmount: 700000,
        deposit: 140000,
        interestRate: 5.5,
        loanTermYears: 25,
        repaymentFrequency: 'fortnightly',
        offsetBalance: 0,
        buyerType: 'first_home_buyer',
        includeLegalFees: true,
        includeBuildingInspection: true,
      },
      expenses: [],
    }
    mockUseSearchParams.mockReturnValue(new URLSearchParams({ data: encodeMortgageData(shared) }))

    const { result } = renderHook(() => useMortgageCalculator())

    await waitFor(() => expect(result.current.inputs.loanAmount).toBe(700000))
    expect(result.current.inputs.buyerType).toBe('first_home_buyer')
  })

  it('persists inputs to localStorage once loaded', async () => {
    const { result } = renderHook(() => useMortgageCalculator())
    await waitFor(() => expect(result.current.inputs.loanAmount).toBe(0))

    act(() => {
      result.current.setInputs({ ...result.current.inputs, loanAmount: 550000 })
    })

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('finance-tools-mortgage-inputs') || '{}')
      expect(stored.loanAmount).toBe(550000)
    })
  })

  it('resets inputs and expenses to their defaults when confirmed', async () => {
    const { result } = renderHook(() => useMortgageCalculator())
    await waitFor(() => expect(result.current.inputs.loanAmount).toBe(0))

    act(() => {
      result.current.setInputs({ ...result.current.inputs, loanAmount: 400000 })
      result.current.setExpenses([{ id: '1', name: 'Rates', amount: 300, frequency: 'quarterly' }])
    })
    await waitFor(() => expect(result.current.inputs.loanAmount).toBe(400000))

    act(() => {
      result.current.handleReset()
    })

    expect(result.current.inputs.loanAmount).toBe(0)
    expect(result.current.expenses).toEqual([])

    // The save effect re-persists the (now-default) state right after reset,
    // so localStorage ends up holding the defaults rather than being empty.
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('finance-tools-mortgage-inputs') || '{}')
      expect(stored.loanAmount).toBe(0)
    })
    expect(JSON.parse(localStorage.getItem('finance-tools-mortgage-expenses') || '[]')).toEqual([])
  })

  it('does not reset when the confirmation is declined', async () => {
    vi.stubGlobal(
      'confirm',
      vi.fn(() => false),
    )
    const { result } = renderHook(() => useMortgageCalculator())
    await waitFor(() => expect(result.current.inputs.loanAmount).toBe(0))

    act(() => {
      result.current.setInputs({ ...result.current.inputs, loanAmount: 400000 })
    })
    await waitFor(() => expect(result.current.inputs.loanAmount).toBe(400000))

    act(() => {
      result.current.handleReset()
    })

    expect(result.current.inputs.loanAmount).toBe(400000)
  })

  it('generates a share URL and opens the share modal', async () => {
    const { result } = renderHook(() => useMortgageCalculator())
    await waitFor(() => expect(result.current.inputs.loanAmount).toBe(0))

    act(() => {
      result.current.handleShare()
    })

    expect(result.current.showShareModal).toBe(true)
    expect(result.current.shareUrl).toContain('/tools/mortgage?data=')
  })

  it('copies the share URL to the clipboard', async () => {
    const { result } = renderHook(() => useMortgageCalculator())
    await waitFor(() => expect(result.current.inputs.loanAmount).toBe(0))

    act(() => {
      result.current.handleShare()
    })

    await act(async () => {
      await result.current.handleCopy()
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(result.current.shareUrl)
    expect(result.current.copied).toBe(true)
  })
})
