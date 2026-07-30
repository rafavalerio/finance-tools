import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BudgetPlannerPage from './page'

beforeEach(() => {
  localStorage.clear()
})

describe('BudgetPlannerPage', () => {
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
