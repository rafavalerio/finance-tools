import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExpenseItem } from './ExpenseItem'
import { Expense } from '@/types/budget'

const expense: Expense = {
  id: '1',
  name: 'Rates',
  amount: 300,
  frequency: 'quarterly',
  category: 'housing',
}

describe('ExpenseItem', () => {
  it('renders the expense values', () => {
    render(<ExpenseItem expense={expense} onChange={() => {}} onRemove={() => {}} />)
    expect(screen.getByLabelText('Expense Name')).toHaveValue('Rates')
    expect(screen.getByLabelText('Amount')).toHaveValue(300)
    expect(screen.getByLabelText('Frequency')).toHaveValue('quarterly')
    expect(screen.getByLabelText('Category')).toHaveValue('housing')
  })

  it('emits the updated expense when the category changes', async () => {
    const onChange = vi.fn()
    render(<ExpenseItem expense={expense} onChange={onChange} onRemove={() => {}} />)
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'utilities')
    expect(onChange).toHaveBeenCalledWith({ ...expense, category: 'utilities' })
  })

  it('emits the updated expense when the name changes', async () => {
    const onChange = vi.fn()
    render(<ExpenseItem expense={expense} onChange={onChange} onRemove={() => {}} />)
    await userEvent.type(screen.getByLabelText('Expense Name'), '!')
    expect(onChange).toHaveBeenCalledWith({ ...expense, name: 'Rates!' })
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
    expect(screen.getByLabelText('Category')).toHaveAttribute('id', 'expense-category-1')
  })
})
