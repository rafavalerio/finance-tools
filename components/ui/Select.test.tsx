import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select } from './Select'

const options = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
]

describe('Select', () => {
  it('renders all options', () => {
    render(<Select label="Frequency" options={options} onChange={() => {}} />)
    expect(screen.getByRole('option', { name: 'Monthly' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Weekly' })).toBeInTheDocument()
  })

  it('associates the label with the select', () => {
    render(<Select label="Frequency" options={options} onChange={() => {}} />)
    expect(screen.getByLabelText('Frequency')).toBeInTheDocument()
  })

  it('calls onChange when a new option is selected', async () => {
    const onChange = vi.fn()
    render(<Select label="Frequency" options={options} onChange={onChange} />)
    await userEvent.selectOptions(screen.getByLabelText('Frequency'), 'weekly')
    expect(onChange).toHaveBeenCalled()
  })

  it('shows an error message when provided', () => {
    render(<Select label="Frequency" options={options} onChange={() => {}} error="Required" />)
    expect(screen.getByText('Required')).toBeInTheDocument()
  })
})
