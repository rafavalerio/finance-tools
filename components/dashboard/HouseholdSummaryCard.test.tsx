import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HouseholdSummaryCard } from './HouseholdSummaryCard'
import { HouseholdMember } from '@/types/household'

describe('HouseholdSummaryCard', () => {
  it('shows a call to action when there are no members', () => {
    render(<HouseholdSummaryCard members={[]} />)
    expect(screen.getByText('Set up your household to get started.')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/profile')
  })

  it('shows member count and combined income when members exist', () => {
    const members: HouseholdMember[] = [
      { id: '1', name: 'Rafael', income: 95000 },
      { id: '2', name: 'Partner', income: 80000 },
    ]
    render(<HouseholdSummaryCard members={members} />)
    expect(screen.getByText('2 members · $175k/yr')).toBeInTheDocument()
    expect(screen.getByText('Rafael, Partner')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/profile')
  })

  it('uses singular wording for a single member', () => {
    const members: HouseholdMember[] = [{ id: '1', name: 'Rafael', income: 95000 }]
    render(<HouseholdSummaryCard members={members} />)
    expect(screen.getByText('1 member · $95k/yr')).toBeInTheDocument()
  })
})
