import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from './Checkbox'

describe('Checkbox', () => {
  it('renders its label and associates it with the input', () => {
    render(<Checkbox label="Include legal fees" onChange={() => {}} />)
    expect(screen.getByLabelText('Include legal fees')).toBeInTheDocument()
  })

  it('reflects the checked state', () => {
    render(<Checkbox label="Include legal fees" checked readOnly />)
    expect(screen.getByLabelText('Include legal fees')).toBeChecked()
  })

  it('calls onChange when toggled', async () => {
    const onChange = vi.fn()
    render(<Checkbox label="Include legal fees" checked={false} onChange={onChange} />)
    await userEvent.click(screen.getByLabelText('Include legal fees'))
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
