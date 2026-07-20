import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MortgageCalculatorPage from './page'

const emptySearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useSearchParams: () => emptySearchParams,
}))

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal(
    'confirm',
    vi.fn(() => true),
  )
})

describe('MortgageCalculatorPage', () => {
  it('shows calculated results after entering loan details', async () => {
    render(<MortgageCalculatorPage />)

    expect(screen.getByText('Enter your loan details to see the results.')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Property Price'), '500000')
    await userEvent.type(screen.getByLabelText('Your Deposit'), '100000')
    await userEvent.type(screen.getByLabelText('Interest Rate (% p.a.)'), '6')

    expect(
      screen.queryByText('Enter your loan details to see the results.'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Results Summary')).toBeInTheDocument()
  })

  it('clears the form when Reset is confirmed', async () => {
    render(<MortgageCalculatorPage />)

    await userEvent.type(screen.getByLabelText('Property Price'), '500000')
    expect(screen.getByLabelText('Property Price')).toHaveValue(500000)

    await userEvent.click(screen.getByRole('button', { name: /reset/i }))

    expect(screen.getByLabelText('Property Price')).toHaveValue(null)
  })

  it('opens the share modal with a generated link', async () => {
    render(<MortgageCalculatorPage />)

    await userEvent.click(screen.getByRole('button', { name: /share/i }))

    expect(screen.getByText('Share Calculator')).toBeInTheDocument()
    expect(screen.getByDisplayValue(/\/tools\/mortgage\?data=/)).toBeInTheDocument()
  })

  it('shows a named split once a household of two or more exists and is selected', async () => {
    localStorage.setItem(
      'finance-tools-household',
      JSON.stringify([
        { id: 'a', name: 'Alex', income: 100000 },
        { id: 'b', name: 'Sam', income: 50000 },
      ]),
    )

    render(<MortgageCalculatorPage />)

    await userEvent.type(await screen.findByLabelText('Property Price'), '500000')
    await userEvent.type(screen.getByLabelText('Your Deposit'), '100000')
    await userEvent.type(screen.getByLabelText('Interest Rate (% p.a.)'), '6')

    await userEvent.click(await screen.findByLabelText('Alex'))
    await userEvent.click(screen.getByLabelText('Sam'))

    // "Alex"/"Sam" now appear twice each: once as a checkbox label (MortgageForm) and once as
    // a split stat label (ResultsSummary) — assert on the count rather than a single match.
    expect(await screen.findByText('Split')).toBeInTheDocument()
    expect(screen.getAllByText('Alex').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Sam').length).toBeGreaterThanOrEqual(2)
  })
})
