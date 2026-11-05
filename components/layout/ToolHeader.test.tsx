import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ToolHeader } from './ToolHeader'

describe('ToolHeader', () => {
  it('renders the title as a heading', () => {
    render(<ToolHeader title="Mortgage Calculator" actions={[]} />)
    expect(screen.getByRole('heading', { name: 'Mortgage Calculator' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mortgage Planner home' })).toHaveAttribute('href', '/')
  })

  it('renders action buttons directly without a menu trigger', () => {
    render(
      <ToolHeader
        title="Mortgage Calculator"
        actions={[
          { key: 'share', label: 'Share', icon: <span>share-icon</span>, onClick: vi.fn() },
        ]}
      />,
    )
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'More actions' })).not.toBeInTheDocument()
  })
})
