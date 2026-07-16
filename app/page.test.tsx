import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import HomePage from './page'

describe('HomePage', () => {
  it('renders the mortgage calculator tool card linking to its route', () => {
    render(<HomePage />)
    const link = screen.getByRole('link', { name: /mortgage calculator/i })
    expect(link).toHaveAttribute('href', '/tools/mortgage')
  })

  it('renders a placeholder card for upcoming tools', () => {
    render(<HomePage />)
    expect(screen.getByText('More Coming Soon')).toBeInTheDocument()
  })
})
