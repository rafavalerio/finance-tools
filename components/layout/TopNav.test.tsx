import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TopNav } from './TopNav'

const mockUsePathname = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

describe('TopNav', () => {
  it('renders a link to each tool', () => {
    mockUsePathname.mockReturnValue('/')
    render(<TopNav />)
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile')
    expect(screen.getByRole('link', { name: 'Mortgage' })).toHaveAttribute(
      'href',
      '/tools/mortgage',
    )
  })

  it('shows the budget link as disabled, not a link', () => {
    mockUsePathname.mockReturnValue('/')
    render(<TopNav />)
    expect(screen.queryByRole('link', { name: /budget/i })).not.toBeInTheDocument()
    expect(screen.getAllByText(/budget/i).length).toBeGreaterThan(0)
  })

  it('opens and closes the mobile menu', async () => {
    mockUsePathname.mockReturnValue('/')
    render(<TopNav />)

    const toggle = screen.getByRole('button', { name: 'Open navigation menu' })
    await userEvent.click(toggle)
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
