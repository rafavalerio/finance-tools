import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExpenseItem } from './ExpenseItem'
import { Expense } from '@/types/mortgage'

const expense: Expense = { id: '1', name: 'Council Rates', amount: 300, frequency: 'quarterly' }

describe('ExpenseItem', () => {
  it('renders the expense fields', () => {
    render(<ExpenseItem expense={expense} onChange={() => {}} onRemove={() => {}} />)
    expect(screen.getByLabelText('Expense Name')).toHaveValue('Council Rates')
    expect(screen.getByLabelText('Amount')).toHaveValue(300)
    expect(screen.getByLabelText('Frequency')).toHaveValue('quarterly')
  })

  it('calls onChange with the updated name', async () => {
    const onChange = vi.fn()
    render(<ExpenseItem expense={expense} onChange={onChange} onRemove={() => {}} />)
    await userEvent.type(screen.getByLabelText('Expense Name'), '!')
    expect(onChange).toHaveBeenCalledWith({ ...expense, name: 'Council Rates!' })
  })

  it('calls onRemove when the remove button is clicked', async () => {
    const onRemove = vi.fn()
    render(<ExpenseItem expense={expense} onChange={() => {}} onRemove={onRemove} />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove expense' }))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('scopes field ids to the expense id so multiple rows do not collide', () => {
    render(<ExpenseItem expense={expense} onChange={() => {}} onRemove={() => {}} />)
    expect(screen.getByLabelText('Expense Name')).toHaveAttribute('id', 'expense-name-1')
  })
})
