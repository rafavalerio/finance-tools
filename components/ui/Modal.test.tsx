import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from './Modal'

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Share Calculator">
        Content
      </Modal>,
    )
    expect(screen.queryByText('Share Calculator')).not.toBeInTheDocument()
  })

  it('renders the title and children when open', () => {
    render(
      <Modal isOpen onClose={() => {}} title="Share Calculator">
        Content
      </Modal>,
    )
    expect(screen.getByText('Share Calculator')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen onClose={onClose} title="Share Calculator">
        Content
      </Modal>,
    )
    await userEvent.click(screen.getByRole('button'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the backdrop is clicked', async () => {
    const onClose = vi.fn()
    const { container } = render(
      <Modal isOpen onClose={onClose} title="Share Calculator">
        Content
      </Modal>,
    )
    const backdrop = container.querySelector('.fixed.inset-0 > div.absolute') as HTMLElement
    await userEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen onClose={onClose} title="Share Calculator">
        Content
      </Modal>,
    )
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
