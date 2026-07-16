import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShareModal } from './ShareModal'

describe('ShareModal', () => {
  it('renders nothing when closed', () => {
    render(
      <ShareModal
        isOpen={false}
        onClose={() => {}}
        shareUrl="https://example.com/tools/mortgage?data=abc"
        copied={false}
        onCopy={() => {}}
      />,
    )
    expect(screen.queryByText('Share Calculator')).not.toBeInTheDocument()
  })

  it('shows the share URL when open', () => {
    render(
      <ShareModal
        isOpen
        onClose={() => {}}
        shareUrl="https://example.com/tools/mortgage?data=abc"
        copied={false}
        onCopy={() => {}}
      />,
    )
    expect(
      screen.getByDisplayValue('https://example.com/tools/mortgage?data=abc'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
  })

  it('calls onCopy when the copy button is clicked', async () => {
    const onCopy = vi.fn()
    render(
      <ShareModal
        isOpen
        onClose={() => {}}
        shareUrl="https://example.com/tools/mortgage?data=abc"
        copied={false}
        onCopy={onCopy}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /copy/i }))
    expect(onCopy).toHaveBeenCalledTimes(1)
  })

  it('shows a copied state when copied is true', () => {
    render(
      <ShareModal
        isOpen
        onClose={() => {}}
        shareUrl="https://example.com/tools/mortgage?data=abc"
        copied
        onCopy={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: /copied/i })).toBeInTheDocument()
  })
})
