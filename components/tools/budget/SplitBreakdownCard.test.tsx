import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SplitBreakdownCard } from './SplitBreakdownCard'
import { MemberBudgetShare } from '@/types/budget'

// Deliberately distinct shares and leftovers per member — equal fixtures would let a card that
// renders the wrong member's numbers still pass.
const shares: MemberBudgetShare[] = [
  { memberId: 'a', name: 'Alex', share: 4000, monthlyIncome: 6000, leftover: 2000 },
  { memberId: 'b', name: 'Sam', share: 2000, monthlyIncome: 1500, leftover: -500 },
]

describe('SplitBreakdownCard', () => {
  it('renders nothing when there are no shares', () => {
    const { container } = render(<SplitBreakdownCard shares={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows each member share and leftover against the right member', () => {
    render(<SplitBreakdownCard shares={shares} />)

    const alexTile = screen.getByText('Alex').closest('div')!
    expect(alexTile).toHaveTextContent('$4,000.00')
    expect(screen.getByTestId('member-leftover-a')).toHaveTextContent('$2,000.00 left')

    const samTile = screen.getByText('Sam').closest('div')!
    expect(samTile).toHaveTextContent('$2,000.00')
    expect(screen.getByTestId('member-leftover-b')).toHaveTextContent('$500.00 short')
  })

  it('marks a negative leftover as short', () => {
    render(<SplitBreakdownCard shares={shares} />)
    const sam = screen.getByTestId('member-leftover-b')
    expect(sam).toHaveTextContent('short')
    expect(sam).toHaveClass('text-red-400')
  })
})
