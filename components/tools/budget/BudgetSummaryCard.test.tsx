import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BudgetSummaryCard } from './BudgetSummaryCard'

describe('BudgetSummaryCard', () => {
  it('shows income, expenses, and surplus', () => {
    render(
      <BudgetSummaryCard summary={{ monthlyIncome: 9000, monthlyExpenses: 6500, surplus: 2500 }} />,
    )
    expect(screen.getByText('$9,000.00')).toBeInTheDocument()
    expect(screen.getByText('$6,500.00')).toBeInTheDocument()
    expect(screen.getByText('$2,500.00')).toBeInTheDocument()
    expect(screen.getByText('Left over')).toBeInTheDocument()
  })

  it('labels and styles a negative surplus as a shortfall', () => {
    render(
      <BudgetSummaryCard
        summary={{ monthlyIncome: 5000, monthlyExpenses: 6500, surplus: -1500 }}
      />,
    )
    expect(screen.getByText('Shortfall')).toBeInTheDocument()
    expect(screen.getByTestId('budget-surplus')).toHaveClass('text-red-400')
  })
})
