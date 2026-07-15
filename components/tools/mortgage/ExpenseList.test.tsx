import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExpenseList } from './ExpenseList'
import { Expense } from '@/types/mortgage'

describe('ExpenseList', () => {
  it('shows an empty state when there are no expenses', () => {
    render(<ExpenseList expenses={[]} onChange={() => {}} />)
    expect(screen.getByText('No additional expenses added yet.')).toBeInTheDocument()
  })

  it('renders one row per expense', () => {
    const expenses: Expense[] = [
      { id: '1', name: 'Rates', amount: 300, frequency: 'quarterly' },
      { id: '2', name: 'Insurance', amount: 1200, frequency: 'annually' },
    ]
    render(<ExpenseList expenses={expenses} onChange={() => {}} />)
    expect(screen.getAllByLabelText('Expense Name')).toHaveLength(2)
  })

  it('appends a new blank expense when "Add Expense" is clicked', async () => {
    const onChange = vi.fn()
    render(<ExpenseList expenses={[]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /add expense/i }))

    expect(onChange).toHaveBeenCalledTimes(1)
    const [newExpenses] = onChange.mock.calls[0]
    expect(newExpenses).toHaveLength(1)
    expect(newExpenses[0]).toMatchObject({ name: '', amount: 0, frequency: 'monthly' })
  })

  it('removes an expense when its remove button is clicked', async () => {
    const onChange = vi.fn()
    const expenses: Expense[] = [
      { id: '1', name: 'Rates', amount: 300, frequency: 'quarterly' },
      { id: '2', name: 'Insurance', amount: 1200, frequency: 'annually' },
    ]
    render(<ExpenseList expenses={expenses} onChange={onChange} />)
    await userEvent.click(screen.getAllByRole('button', { name: 'Remove expense' })[0])

    expect(onChange).toHaveBeenCalledWith([expenses[1]])
  })
})
