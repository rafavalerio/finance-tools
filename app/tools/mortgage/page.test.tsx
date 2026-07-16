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
})
