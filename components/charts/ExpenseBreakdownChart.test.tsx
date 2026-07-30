import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ExpenseBreakdownChart } from './ExpenseBreakdownChart'
import { ExpenseBreakdownItem } from '@/types/budget'

describe('ExpenseBreakdownChart', () => {
  it('shows an empty state when there is no data', () => {
    render(<ExpenseBreakdownChart data={[]} />)
    expect(screen.getByText('Add expenses to see the breakdown.')).toBeInTheDocument()
  })

  it('renders the chart title when data is provided', () => {
    const data: ExpenseBreakdownItem[] = [
      { name: 'Mortgage', value: 2500, color: 'rgb(217, 119, 87)' },
      { name: 'Rates', value: 100, color: 'rgb(139, 195, 156)' },
    ]
    render(<ExpenseBreakdownChart data={data} />)
    expect(screen.getByText('Monthly Expense Breakdown')).toBeInTheDocument()
    expect(screen.queryByText('Add expenses to see the breakdown.')).not.toBeInTheDocument()
  })
})
