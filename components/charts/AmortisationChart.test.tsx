import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AmortisationChart } from './AmortisationChart'
import { AmortisationDataPoint } from '@/types/mortgage'

describe('AmortisationChart', () => {
  it('shows an empty state when there is no data', () => {
    render(<AmortisationChart data={[]} />)
    expect(
      screen.getByText('Enter your loan details to see the amortisation chart.'),
    ).toBeInTheDocument()
  })

  it('renders the chart title when data is provided', () => {
    const data: AmortisationDataPoint[] = [
      {
        period: 1,
        date: 'Jan 2026',
        balance: 490000,
        principal: 500,
        interest: 2000,
        payment: 2500,
      },
      {
        period: 2,
        date: 'Feb 2026',
        balance: 489500,
        principal: 505,
        interest: 1995,
        payment: 2500,
      },
    ]
    render(<AmortisationChart data={data} />)
    expect(screen.getByText('Loan Balance Over Time')).toBeInTheDocument()
    expect(
      screen.queryByText('Enter your loan details to see the amortisation chart.'),
    ).not.toBeInTheDocument()
  })
})
