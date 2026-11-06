import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResultsSummary } from './ResultsSummary'
import { MortgageResults } from '@/types/mortgage'

const results: MortgageResults = {
  principalAmount: 400000,
  repaymentAmount: 2400,
  repaymentFrequency: 'monthly',
  totalRepayments: 864000,
  totalInterest: 464000,
  payoffDate: new Date('2056-01-01'),
  monthlyMortgagePayment: 2400,
  amortisationSchedule: [],
}

describe('ResultsSummary', () => {
  it('shows an empty state when there are no results', () => {
    render(<ResultsSummary results={null} />)
    expect(screen.getByText('Enter your loan details to see the results.')).toBeInTheDocument()
  })

  it('renders key stats when results are provided', () => {
    render(<ResultsSummary results={results} />)
    expect(screen.getByText('Loan Amount')).toBeInTheDocument()
    expect(screen.getByText('$400,000')).toBeInTheDocument()
    expect(screen.getByText('Monthly Equivalent')).toBeInTheDocument()
    expect(screen.getAllByText('$2,400.00')).toHaveLength(2)
  })

  it('no longer shows a combined monthly outgoing figure', () => {
    render(<ResultsSummary results={results} />)
    expect(screen.queryByText('Total Monthly')).not.toBeInTheDocument()
    expect(screen.queryByText('Other Expenses')).not.toBeInTheDocument()
  })

})
