import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MortgageForm } from './MortgageForm'
import { MortgageInputs } from '@/types/mortgage'

const inputs: MortgageInputs = {
  loanAmount: 500000,
  deposit: 100000,
  interestRate: 6,
  loanTermYears: 30,
  repaymentFrequency: 'monthly',
  offsetBalance: 0,
  buyerType: 'standard',
  includeLegalFees: true,
  includeBuildingInspection: true,
}

describe('MortgageForm', () => {
  it('reflects the current input values', () => {
    render(<MortgageForm inputs={inputs} onChange={() => {}} />)
    expect(screen.getByLabelText('Property Price')).toHaveValue(500000)
    expect(screen.getByLabelText('Your Deposit')).toHaveValue(100000)
    expect(screen.getByLabelText('Interest Rate (% p.a.)')).toHaveValue(6)
    expect(screen.getByLabelText('Repayment Frequency')).toHaveValue('monthly')
    expect(screen.getByLabelText('Buyer Type')).toHaveValue('standard')
  })

  it('calls onChange with a numeric field updated on input', async () => {
    const onChange = vi.fn()
    render(<MortgageForm inputs={inputs} onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Offset Account Balance'), '5')
    expect(onChange).toHaveBeenLastCalledWith({ ...inputs, offsetBalance: 5 })
  })

  it('calls onChange when the buyer type select changes', async () => {
    const onChange = vi.fn()
    render(<MortgageForm inputs={inputs} onChange={onChange} />)
    await userEvent.selectOptions(screen.getByLabelText('Buyer Type'), 'first_home_buyer')
    expect(onChange).toHaveBeenCalledWith({ ...inputs, buyerType: 'first_home_buyer' })
  })

  it('calls onChange when a cost checkbox is toggled', async () => {
    const onChange = vi.fn()
    render(<MortgageForm inputs={inputs} onChange={onChange} />)
    await userEvent.click(screen.getByLabelText(/Legal\/Conveyancing/))
    expect(onChange).toHaveBeenCalledWith({ ...inputs, includeLegalFees: false })
  })
})
