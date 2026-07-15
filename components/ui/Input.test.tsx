import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from './Input'

describe('Input', () => {
  it('associates a label with the input via htmlFor/id', () => {
    render(<Input label="Property Price" />)
    expect(screen.getByLabelText('Property Price')).toBeInTheDocument()
  })

  it('renders prefix and suffix text', () => {
    render(<Input label="Amount" prefix="$" suffix="years" />)
    expect(screen.getByText('$')).toBeInTheDocument()
    expect(screen.getByText('years')).toBeInTheDocument()
  })

  it('shows an error message and error styling', () => {
    render(<Input label="Amount" error="Required" />)
    expect(screen.getByText('Required')).toBeInTheDocument()
    expect(screen.getByLabelText('Amount').className).toMatch(/border-red-500/)
  })

  it('calls onChange as the user types', async () => {
    const onChange = vi.fn()
    render(<Input label="Amount" onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Amount'), '5')
    expect(onChange).toHaveBeenCalled()
  })
})
