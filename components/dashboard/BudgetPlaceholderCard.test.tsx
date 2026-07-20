import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BudgetPlaceholderCard } from './BudgetPlaceholderCard'

describe('BudgetPlaceholderCard', () => {
  it('renders a disabled-looking placeholder', () => {
    render(<BudgetPlaceholderCard />)
    expect(screen.getByText('Budget Planner')).toBeInTheDocument()
    expect(screen.getByText('Coming soon.')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
