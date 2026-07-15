import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Label } from './Label'

describe('Label', () => {
  it('renders its children', () => {
    render(<Label htmlFor="foo">My Label</Label>)
    expect(screen.getByText('My Label')).toBeInTheDocument()
  })

  it('associates with a form control via htmlFor', () => {
    render(
      <>
        <Label htmlFor="foo">My Label</Label>
        <input id="foo" />
      </>,
    )
    expect(screen.getByLabelText('My Label')).toBeInTheDocument()
  })
})
