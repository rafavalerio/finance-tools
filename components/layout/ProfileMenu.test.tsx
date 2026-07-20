import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileMenu } from './ProfileMenu'

beforeEach(() => {
  localStorage.clear()
})

describe('ProfileMenu', () => {
  it('shows a setup CTA when the household is empty', async () => {
    render(<ProfileMenu />)
    await userEvent.click(screen.getByRole('button', { name: 'Open profile menu' }))

    expect(screen.getByText('Set up your household to get started.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /manage household/i })).toHaveAttribute(
      'href',
      '/profile',
    )
  })

  it('shows member count, combined income, and names once configured', async () => {
    localStorage.setItem(
      'finance-tools-household',
      JSON.stringify([
        { id: '1', name: 'Rafael', income: 95000 },
        { id: '2', name: 'Partner', income: 80000 },
      ]),
    )
    render(<ProfileMenu />)
    await userEvent.click(screen.getByRole('button', { name: 'Open profile menu' }))

    expect(await screen.findByText('2 members · $175k/yr')).toBeInTheDocument()
    expect(screen.getByText('Rafael, Partner')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /manage household/i })).toHaveAttribute(
      'href',
      '/profile',
    )
  })

  it('opens and closes via click-outside/Escape', async () => {
    render(<ProfileMenu />)
    const toggle = screen.getByRole('button', { name: 'Open profile menu' })

    await userEvent.click(toggle)
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
