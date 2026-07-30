import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NavDrawer } from './NavDrawer'

const mockUsePathname = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

beforeEach(() => {
  mockUsePathname.mockReturnValue('/')
})

describe('NavDrawer', () => {
  it('renders nothing when closed', () => {
    render(<NavDrawer isOpen={false} onClose={vi.fn()} />)
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument()
  })

  it('renders Dashboard, Mortgage and Budget links when open', () => {
    render(<NavDrawer isOpen onClose={vi.fn()} />)
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Mortgage' })).toHaveAttribute(
      'href',
      '/tools/mortgage',
    )
    expect(screen.getByRole('link', { name: 'Budget' })).toHaveAttribute('href', '/tools/budget')
  })

  it('calls onClose when a link is clicked', async () => {
    const onClose = vi.fn()
    render(<NavDrawer isOpen onClose={onClose} />)
    await userEvent.click(screen.getByRole('link', { name: 'Mortgage' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the backdrop is clicked', async () => {
    const onClose = vi.fn()
    const { container } = render(<NavDrawer isOpen onClose={onClose} />)
    const backdrop = container.querySelector('.fixed.inset-0 > div.absolute') as HTMLElement
    await userEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn()
    render(<NavDrawer isOpen onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Close navigation menu' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose on Escape', async () => {
    const onClose = vi.fn()
    render(<NavDrawer isOpen onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('locks body scroll while open and releases it on close', () => {
    const { rerender } = render(<NavDrawer isOpen onClose={vi.fn()} />)
    expect(document.body.style.overflow).toBe('hidden')

    rerender(<NavDrawer isOpen={false} onClose={vi.fn()} />)
    expect(document.body.style.overflow).toBe('')
  })
})
