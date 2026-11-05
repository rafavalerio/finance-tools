import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HeaderActions } from './HeaderActions'

const buildActions = (onShare = vi.fn(), onReset = vi.fn()) => [
  {
    key: 'share',
    label: 'Share',
    icon: <span aria-hidden="true">share-icon</span>,
    onClick: onShare,
    variant: 'primary' as const,
  },
  {
    key: 'reset',
    label: 'Reset',
    icon: <span aria-hidden="true">reset-icon</span>,
    onClick: onReset,
    variant: 'danger' as const,
  },
]

describe('HeaderActions', () => {
  it('renders the labelled actions inline', () => {
    render(<HeaderActions actions={buildActions()} />)
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('fires each action when its button is clicked', async () => {
    const onShare = vi.fn()
    const onReset = vi.fn()
    render(<HeaderActions actions={buildActions(onShare, onReset)} />)

    await userEvent.click(screen.getByRole('button', { name: 'Share' }))
    expect(onShare).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('styles Reset as a quieter danger action', () => {
    render(<HeaderActions actions={buildActions()} />)
    expect(screen.getByRole('button', { name: 'Reset' }).className).toMatch(/text-red/)
  })

  it('renders nothing when there are no actions', () => {
    const { container } = render(<HeaderActions actions={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
