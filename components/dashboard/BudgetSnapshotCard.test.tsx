import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BudgetSnapshotCard } from './BudgetSnapshotCard'

describe('BudgetSnapshotCard', () => {
  it('prompts to get started when there is no budget yet', () => {
    render(<BudgetSnapshotCard summary={null} topCategories={[]} />)
    expect(screen.getByText(/get started/i)).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/tools/budget')
  })

  it('shows the monthly surplus and top categories', () => {
    render(
      <BudgetSnapshotCard
        summary={{ monthlyIncome: 9000, monthlyExpenses: 6500, surplus: 2500 }}
        topCategories={[
          { name: 'Mortgage', value: 2500, color: '#a' },
          { name: 'Utilities', value: 300, color: '#b' },
        ]}
      />,
    )
    expect(screen.getByText('$2,500.00/mo left')).toBeInTheDocument()
    expect(screen.getByText(/Mortgage/)).toBeInTheDocument()
    expect(screen.getByText(/Utilities/)).toBeInTheDocument()
  })

  it('describes a negative surplus as short', () => {
    render(
      <BudgetSnapshotCard
        summary={{ monthlyIncome: 5000, monthlyExpenses: 6500, surplus: -1500 }}
        topCategories={[]}
      />,
    )
    expect(screen.getByText('$1,500.00/mo short')).toBeInTheDocument()
  })
})
