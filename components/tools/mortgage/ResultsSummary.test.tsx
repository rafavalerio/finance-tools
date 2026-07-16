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
  monthlyExpensesTotal: 300,
  totalMonthlyOutgoing: 2700,
  perPersonAmount: 1350,
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
    expect(screen.getByText('Total Monthly')).toBeInTheDocument()
    expect(screen.getByText('$2,700.00')).toBeInTheDocument()
    expect(screen.getByText('Per Person')).toBeInTheDocument()
    expect(screen.getByText('$1,350.00')).toBeInTheDocument()
  })
})
