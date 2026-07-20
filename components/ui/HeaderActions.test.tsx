import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HeaderActions } from './HeaderActions'

const buildActions = (onShare = vi.fn(), onReset = vi.fn()) => [
  { key: 'share', label: 'Share', icon: <span>share-icon</span>, onClick: onShare },
  {
    key: 'reset',
    label: 'Reset',
    icon: <span>reset-icon</span>,
    onClick: onReset,
    variant: 'danger' as const,
  },
]

describe('HeaderActions', () => {
  it('renders a single round trigger and no inline action buttons', () => {
    render(<HeaderActions actions={buildActions()} />)
    expect(screen.getByRole('button', { name: 'More actions' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^share$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^reset$/i })).not.toBeInTheDocument()
  })

  it('does not show the menu until the trigger is clicked', () => {
    render(<HeaderActions actions={buildActions()} />)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('opens the menu and fires the action when a menu item is clicked', async () => {
    const onShare = vi.fn()
    render(<HeaderActions actions={buildActions(onShare)} />)

    await userEvent.click(screen.getByRole('button', { name: 'More actions' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('menuitem', { name: /share/i }))
    expect(onShare).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes the menu on Escape', async () => {
    render(<HeaderActions actions={buildActions()} />)

    await userEvent.click(screen.getByRole('button', { name: 'More actions' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes the menu when clicking outside', async () => {
    render(
      <div>
        <button>outside</button>
        <HeaderActions actions={buildActions()} />
      </div>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'More actions' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'outside' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('renders the trigger as a distinct circle button', () => {
    render(<HeaderActions actions={buildActions()} />)
    const trigger = screen.getByRole('button', { name: 'More actions' })
    expect(trigger.className).toMatch(/rounded-full/)
  })
})
