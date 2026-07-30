import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MortgageSnapshotCard } from './MortgageSnapshotCard'
import { MortgageResults } from '@/types/mortgage'

const results: MortgageResults = {
  principalAmount: 400000,
  repaymentAmount: 2400,
  repaymentFrequency: 'monthly',
  totalRepayments: 864000,
  totalInterest: 464000,
  payoffDate: new Date('2042-06-01'),
  monthlyMortgagePayment: 2340,
  splitBreakdown: [],
  amortisationSchedule: [],
}

describe('MortgageSnapshotCard', () => {
  it('shows a call to action when there are no results', () => {
    render(<MortgageSnapshotCard results={null} />)
    expect(screen.getByText('Get started with the mortgage calculator.')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/tools/mortgage')
  })

  it('shows the monthly payment and payoff year when results exist', () => {
    render(<MortgageSnapshotCard results={results} />)
    expect(screen.getByText('$2,340.00/mo')).toBeInTheDocument()
    expect(screen.getByText('Payoff 2042')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/tools/mortgage')
  })
})
