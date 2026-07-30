import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BudgetPlannerPage from './page'

beforeEach(() => {
  localStorage.clear()
})

describe('BudgetPlannerPage', () => {
  it('shows a loading state instead of flashing the empty states before data loads', async () => {
    render(<BudgetPlannerPage />)

    // Synchronously after the first render, nothing has resolved yet.
    expect(screen.getByText('Loading budget...')).toBeInTheDocument()
    expect(screen.queryByText('No expenses added yet.')).not.toBeInTheDocument()
    expect(screen.queryByText('No household members yet.')).not.toBeInTheDocument()
    expect(screen.queryByText('No mortgage repayment yet.')).not.toBeInTheDocument()

    await screen.findByText('No expenses added yet.')
    expect(screen.queryByText('Loading budget...')).not.toBeInTheDocument()
  })

  it('adding an expense updates the monthly summary and breakdown chart', async () => {
    render(<BudgetPlannerPage />)

    await screen.findByText('No expenses added yet.')

    await userEvent.click(screen.getByRole('button', { name: 'Add expense' }))
    await userEvent.type(screen.getByLabelText('Expense Name'), 'Groceries')
    await userEvent.type(screen.getByLabelText('Amount'), '400')

    expect(screen.getByTestId('budget-surplus')).toHaveTextContent('-$400')
    expect(screen.getAllByText('Groceries').length).toBeGreaterThanOrEqual(1)
  })

  it('pins the mortgage repayment from saved mortgage data', async () => {
    localStorage.setItem(
      'finance-tools-mortgage-inputs',
      JSON.stringify({
        loanAmount: 500000,
        deposit: 100000,
        interestRate: 6,
        loanTermYears: 30,
        repaymentFrequency: 'monthly',
        offsetBalance: 0,
        buyerType: 'standard',
        state: 'VIC',
        includeLegalFees: true,
        includeBuildingInspection: true,
      }),
    )

    render(<BudgetPlannerPage />)

    expect(await screen.findByText('Mortgage repayment')).toBeInTheDocument()
    expect(screen.queryByText('No mortgage repayment yet.')).not.toBeInTheDocument()

    // The pinned row must also feed the totals — a repayment that displays but is left out of
    // the summary would otherwise pass. With no other expenses and no household income, total
    // expenses equal the repayment and the surplus is its negation.
    const mortgageRow = screen.getByText('Mortgage repayment').closest('div')!.parentElement!
    const repayment = mortgageRow.textContent!.match(/\$[\d,]+\.\d{2}/)![0]
    expect(repayment).not.toBe('$0.00')
    expect(screen.getByTestId('budget-surplus')).toHaveTextContent(`-${repayment}`)
  })

  it('a take-home override flows through to the surplus and the per-member leftovers', async () => {
    localStorage.setItem(
      'finance-tools-household',
      JSON.stringify([
        { id: 'a', name: 'Alex', income: 120000 },
        { id: 'b', name: 'Sam', income: 60000 },
      ]),
    )
    localStorage.setItem(
      'finance-tools-household-split',
      JSON.stringify({ memberIds: ['a', 'b'], mode: 'even' }),
    )

    render(<BudgetPlannerPage />)

    await screen.findByText('No expenses added yet.')

    await userEvent.click(screen.getByRole('button', { name: 'Add expense' }))
    await userEvent.type(screen.getByLabelText('Expense Name'), 'Groceries')
    await userEvent.type(screen.getByLabelText('Amount'), '600')

    // Gross monthly income is 180000 / 12 = 15,000 → surplus 14,400.
    expect(screen.getByTestId('budget-surplus')).toHaveTextContent('$14,400.00')
    // Even split of the 600 outgoing: 300 each, from 10,000 / 5,000 gross monthly.
    expect(screen.getByTestId('member-leftover-a')).toHaveTextContent('$9,700.00 left')
    expect(screen.getByTestId('member-leftover-b')).toHaveTextContent('$4,700.00 left')

    await userEvent.type(screen.getByLabelText('Monthly take-home'), '9000')

    // Override replaces gross everywhere: surplus 9,000 - 600 = 8,400, and the override is
    // apportioned 2:1 by gross income → 6,000 / 3,000 minus 300 each.
    expect(screen.getByTestId('budget-surplus')).toHaveTextContent('$8,400.00')
    expect(screen.getByTestId('member-leftover-a')).toHaveTextContent('$5,700.00 left')
    expect(screen.getByTestId('member-leftover-b')).toHaveTextContent('$2,700.00 left')
  })

  it('shows the household split once the household has 2+ members', async () => {
    localStorage.setItem(
      'finance-tools-household',
      JSON.stringify([
        { id: 'a', name: 'Alex', income: 100000 },
        { id: 'b', name: 'Sam', income: 50000 },
      ]),
    )

    render(<BudgetPlannerPage />)

    expect(await screen.findByText('Alex')).toBeInTheDocument()
    expect(screen.getByText('Sam')).toBeInTheDocument()
  })
})
