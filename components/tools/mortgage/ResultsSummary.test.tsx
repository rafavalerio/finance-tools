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
  splitBreakdown: [
    { memberId: 'a', name: 'Rafael', amount: 1350 },
    { memberId: 'b', name: 'Partner', amount: 1350 },
  ],
  amortisationSchedule: [],
}

describe('ResultsSummary', () => {
  it('shows an empty state when there are no results', () => {
    render(<ResultsSummary results={null} splitBreakdown={[]} />)
    expect(screen.getByText('Enter your loan details to see the results.')).toBeInTheDocument()
  })

  it('renders key stats when results are provided', () => {
    render(<ResultsSummary results={results} splitBreakdown={[]} />)
    expect(screen.getByText('Loan Amount')).toBeInTheDocument()
    expect(screen.getByText('$400,000')).toBeInTheDocument()
    expect(screen.getByText('Total Monthly')).toBeInTheDocument()
    expect(screen.getByText('$2,700.00')).toBeInTheDocument()
  })

  it('shows no split section when the breakdown is empty', () => {
    render(<ResultsSummary results={results} splitBreakdown={[]} />)
    expect(screen.queryByText('Split')).not.toBeInTheDocument()
  })

  it('renders one stat per person in the split breakdown', () => {
    render(
      <ResultsSummary
        results={results}
        splitBreakdown={[
          { name: 'Rafael', amount: 1350 },
          { name: 'Partner', amount: 1350 },
        ]}
      />,
    )
    expect(screen.getByText('Split')).toBeInTheDocument()
    expect(screen.getByText('Rafael')).toBeInTheDocument()
    expect(screen.getByText('Partner')).toBeInTheDocument()
    expect(screen.getAllByText('$1,350.00')).toHaveLength(2)
  })
})
