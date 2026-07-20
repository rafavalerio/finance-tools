import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TopNav } from './TopNav'

const mockUsePathname = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

beforeEach(() => {
  localStorage.clear()
  mockUsePathname.mockReturnValue('/')
})

describe('TopNav', () => {
  it('renders a link to Mortgage but not a plain Profile link', () => {
    render(<TopNav />)
    expect(screen.getByRole('link', { name: 'Mortgage' })).toHaveAttribute(
      'href',
      '/tools/mortgage',
    )
    expect(screen.queryByRole('link', { name: 'Profile' })).not.toBeInTheDocument()
  })

  it('shows the budget link as disabled, not a link', () => {
    render(<TopNav />)
    expect(screen.queryByRole('link', { name: /budget/i })).not.toBeInTheDocument()
    expect(screen.getAllByText(/budget/i).length).toBeGreaterThan(0)
  })

  it('opens and closes the mobile menu', async () => {
    render(<TopNav />)

    const toggle = screen.getByRole('button', { name: 'Open navigation menu' })
    await userEvent.click(toggle)
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('renders the profile menu button, always visible', () => {
    render(<TopNav />)
    expect(screen.getByRole('button', { name: 'Open profile menu' })).toBeInTheDocument()
  })
})
