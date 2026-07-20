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
  it('renders the brand link to the dashboard', () => {
    render(<TopNav />)
    expect(screen.getByRole('link', { name: /finance tools/i })).toHaveAttribute('href', '/')
  })

  it('renders the profile menu button, always visible', () => {
    render(<TopNav />)
    expect(screen.getByRole('button', { name: 'Open profile menu' })).toBeInTheDocument()
  })

  it('opens the nav drawer from the hamburger button and closes it on Escape', async () => {
    render(<TopNav />)

    expect(screen.queryByRole('link', { name: 'Mortgage' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }))
    expect(screen.getByRole('link', { name: 'Mortgage' })).toHaveAttribute(
      'href',
      '/tools/mortgage',
    )

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('link', { name: 'Mortgage' })).not.toBeInTheDocument()
  })
})
