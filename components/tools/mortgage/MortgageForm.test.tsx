import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MortgageForm } from './MortgageForm'
import { MortgageInputs } from '@/types/mortgage'
import { HouseholdMember } from '@/types/household'

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
  splitMemberIds: [],
  splitMode: 'even',
}

describe('MortgageForm', () => {
  it('reflects the current input values', () => {
    render(<MortgageForm inputs={inputs} onChange={() => {}} members={[]} />)
    expect(screen.getByLabelText('Property Price')).toHaveValue(500000)
    expect(screen.getByLabelText('Your Deposit')).toHaveValue(100000)
    expect(screen.getByLabelText('Interest Rate (% p.a.)')).toHaveValue(6)
    expect(screen.getByLabelText('Repayment Frequency')).toHaveValue('monthly')
    expect(screen.getByLabelText('Buyer Type')).toHaveValue('standard')
  })

  it('calls onChange with a numeric field updated on input', async () => {
    const onChange = vi.fn()
    render(<MortgageForm inputs={inputs} onChange={onChange} members={[]} />)
    await userEvent.type(screen.getByLabelText('Offset Account Balance'), '5')
    expect(onChange).toHaveBeenLastCalledWith({ ...inputs, offsetBalance: 5 })
  })

  it('calls onChange when the buyer type select changes', async () => {
    const onChange = vi.fn()
    render(<MortgageForm inputs={inputs} onChange={onChange} members={[]} />)
    await userEvent.selectOptions(screen.getByLabelText('Buyer Type'), 'first_home_buyer')
    expect(onChange).toHaveBeenCalledWith({ ...inputs, buyerType: 'first_home_buyer' })
  })

  it('calls onChange when a cost checkbox is toggled', async () => {
    const onChange = vi.fn()
    render(<MortgageForm inputs={inputs} onChange={onChange} members={[]} />)
    await userEvent.click(screen.getByLabelText(/Legal\/Conveyancing/))
    expect(onChange).toHaveBeenCalledWith({ ...inputs, includeLegalFees: false })
  })

  it('does not show the split section with fewer than two household members', () => {
    const oneMember: HouseholdMember[] = [{ id: 'a', name: 'Alex', income: 100000 }]
    render(<MortgageForm inputs={inputs} onChange={() => {}} members={oneMember} />)
    expect(screen.queryByText('Split between:')).not.toBeInTheDocument()
  })

  it('shows a checkbox per member and toggles splitMemberIds', async () => {
    const onChange = vi.fn()
    const members: HouseholdMember[] = [
      { id: 'a', name: 'Alex', income: 100000 },
      { id: 'b', name: 'Sam', income: 50000 },
    ]
    render(<MortgageForm inputs={inputs} onChange={onChange} members={members} />)

    expect(screen.getByText('Split between:')).toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('Alex'))
    expect(onChange).toHaveBeenCalledWith({ ...inputs, splitMemberIds: ['a'] })
  })

  it('toggles splitMode between even and income', async () => {
    const onChange = vi.fn()
    const members: HouseholdMember[] = [
      { id: 'a', name: 'Alex', income: 100000 },
      { id: 'b', name: 'Sam', income: 50000 },
    ]
    render(<MortgageForm inputs={inputs} onChange={onChange} members={members} />)

    await userEvent.click(screen.getByRole('button', { name: 'Split by income' }))
    expect(onChange).toHaveBeenCalledWith({ ...inputs, splitMode: 'income' })
  })
})
