import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardTitle, CardContent } from './Card'

describe('Card', () => {
  it('renders header, title, and content together', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>My Title</CardTitle>
        </CardHeader>
        <CardContent>My content</CardContent>
      </Card>,
    )

    expect(screen.getByRole('heading', { name: 'My Title' })).toBeInTheDocument()
    expect(screen.getByText('My content')).toBeInTheDocument()
  })

  it('applies elevated variant styles', () => {
    render(<Card variant="elevated" data-testid="card" />)
    expect(screen.getByTestId('card').className).toMatch(/shadow-lg/)
  })

  it('renders header actions alongside the title', () => {
    render(
      <Card>
        <CardHeader actions={<button>Add Item</button>}>
          <CardTitle>My Title</CardTitle>
        </CardHeader>
      </Card>,
    )

    expect(screen.getByRole('heading', { name: 'My Title' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument()
  })

  it('lays out actions responsively (stacked on mobile, inline from sm:)', () => {
    render(
      <Card>
        <CardHeader data-testid="header" actions={<button>Add Item</button>}>
          <CardTitle>My Title</CardTitle>
        </CardHeader>
      </Card>,
    )

    expect(screen.getByTestId('header').className).toMatch(/flex-col/)
    expect(screen.getByTestId('header').className).toMatch(/sm:flex-row/)
  })
})
