import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ToolHeader } from './ToolHeader'

describe('ToolHeader', () => {
  it('renders a single Mortgage Planner heading linked to home', () => {
    render(<ToolHeader actions={[]} />)
    expect(screen.getByRole('heading', { name: 'Mortgage Planner' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mortgage Planner' })).toHaveAttribute('href', '/')
    expect(screen.queryByText('Mortgage Calculator')).not.toBeInTheDocument()
  })

  it('renders action buttons directly without a menu trigger', () => {
    render(
      <ToolHeader
        actions={[
          { key: 'share', label: 'Share', icon: <span>share-icon</span>, onClick: vi.fn() },
        ]}
      />,
    )
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'More actions' })).not.toBeInTheDocument()
  })
})
