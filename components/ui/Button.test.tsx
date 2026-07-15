import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('renders its children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('fires onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click me</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not fire onClick when disabled', async () => {
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} disabled>
        Click me
      </Button>,
    )
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('applies variant and size classes', () => {
    render(
      <Button variant="secondary" size="lg">
        Click me
      </Button>,
    )
    const button = screen.getByRole('button')
    expect(button.className).toMatch(/bg-card/)
    expect(button.className).toMatch(/text-lg/)
  })

  it('merges a custom className with the defaults', () => {
    render(<Button className="custom-class">Click me</Button>)
    expect(screen.getByRole('button').className).toMatch(/custom-class/)
  })
})
