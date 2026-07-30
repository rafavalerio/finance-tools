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

    await userEvent.click(screen.getByRole('button', { name: 'More actions' }))
    await userEvent.click(screen.getByRole('menuitem', { name: /reset/i }))

    expect(screen.getByLabelText('Property Price')).toHaveValue(null)
  })

  it('opens the share modal with a generated link', async () => {
    render(<MortgageCalculatorPage />)

    await userEvent.click(screen.getByRole('button', { name: 'More actions' }))
    await userEvent.click(screen.getByRole('menuitem', { name: /share/i }))

    expect(screen.getByText('Share Calculator')).toBeInTheDocument()
    expect(screen.getByDisplayValue(/\/tools\/mortgage\?data=/)).toBeInTheDocument()
  })

  it('shows the household split once the household has 2+ members', async () => {
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

    // Household split config seeds to "everyone" the first time there are 2+ members and
    // nothing's been configured — the mortgage page just displays the resulting breakdown.
    expect(await screen.findByText('Repayment split')).toBeInTheDocument()
    expect(screen.getAllByText('Alex').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Sam').length).toBeGreaterThanOrEqual(1)
  })
})
