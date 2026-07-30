import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SplitBreakdownCard } from './SplitBreakdownCard'
import { MemberBudgetShare } from '@/types/budget'

const shares: MemberBudgetShare[] = [
  { memberId: 'a', name: 'Alex', share: 3000, monthlyIncome: 6000, leftover: 3000 },
  { memberId: 'b', name: 'Sam', share: 3000, monthlyIncome: 2500, leftover: -500 },
]

describe('SplitBreakdownCard', () => {
  it('renders nothing when there are no shares', () => {
    const { container } = render(<SplitBreakdownCard shares={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows each member share and leftover', () => {
    render(<SplitBreakdownCard shares={shares} />)
    expect(screen.getByText('Alex')).toBeInTheDocument()
    expect(screen.getByText('Sam')).toBeInTheDocument()
    expect(screen.getAllByText('$3,000.00')).toHaveLength(2)
    expect(screen.getByText(/\$3,000\.00 left/)).toBeInTheDocument()
  })

  it('marks a negative leftover as short', () => {
    render(<SplitBreakdownCard shares={shares} />)
    const sam = screen.getByTestId('member-leftover-b')
    expect(sam).toHaveTextContent('short')
    expect(sam).toHaveClass('text-red-400')
  })
})
