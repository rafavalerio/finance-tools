import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NavDropdown } from './NavDropdown'

const mockUsePathname = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

beforeEach(() => {
  mockUsePathname.mockReturnValue('/')
})

describe('NavDropdown', () => {
  it('renders nothing when closed', () => {
    render(<NavDropdown isOpen={false} onClose={vi.fn()} />)
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument()
  })

  it('renders Dashboard, Mortgage links and a disabled Budget entry when open', () => {
    render(<NavDropdown isOpen onClose={vi.fn()} />)
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Mortgage' })).toHaveAttribute(
      'href',
      '/tools/mortgage',
    )
    expect(screen.queryByRole('link', { name: /budget/i })).not.toBeInTheDocument()
    expect(screen.getByText(/budget/i)).toBeInTheDocument()
  })

  it('calls onClose when a link is clicked', async () => {
    const onClose = vi.fn()
    render(<NavDropdown isOpen onClose={onClose} />)
    await userEvent.click(screen.getByRole('link', { name: 'Mortgage' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
