import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TopNav } from './TopNav'

describe('TopNav', () => {
  it('renders the mortgage planner brand link to home', () => {
    render(<TopNav />)
    expect(screen.getByRole('link', { name: /mortgage planner/i })).toHaveAttribute('href', '/')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
