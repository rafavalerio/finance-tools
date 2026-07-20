import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ToolHeader } from './ToolHeader'

describe('ToolHeader', () => {
  it('renders the title as a heading', () => {
    render(<ToolHeader title="Mortgage Calculator" actions={[]} />)
    expect(screen.getByRole('heading', { name: 'Mortgage Calculator' })).toBeInTheDocument()
  })

  it('renders the actions trigger and no back link', () => {
    render(
      <ToolHeader
        title="Mortgage Calculator"
        actions={[
          { key: 'share', label: 'Share', icon: <span>share-icon</span>, onClick: vi.fn() },
        ]}
      />,
    )
    expect(screen.getByRole('button', { name: 'More actions' })).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
