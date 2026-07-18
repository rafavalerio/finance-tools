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
  it('renders a labeled button for each action', () => {
    render(<HeaderActions actions={buildActions()} />)
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
  })

  it('does not show the menu until the "More actions" trigger is clicked', () => {
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
})
