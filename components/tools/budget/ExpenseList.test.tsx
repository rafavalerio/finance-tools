import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExpenseList } from './ExpenseList'
import { Expense } from '@/types/budget'

const expenses: Expense[] = [
  { id: '1', name: 'Rates', amount: 300, frequency: 'quarterly', category: 'housing' },
  { id: '2', name: 'Insurance', amount: 1200, frequency: 'annually', category: 'insurance' },
]

describe('ExpenseList', () => {
  it('shows an empty state when there are no expenses', () => {
    render(<ExpenseList expenses={[]} onChange={() => {}} mortgageMonthly={0} />)
    expect(screen.getByText('No expenses added yet.')).toBeInTheDocument()
  })

  it('renders one row per expense', () => {
    render(<ExpenseList expenses={expenses} onChange={() => {}} mortgageMonthly={0} />)
    expect(screen.getAllByLabelText('Expense Name')).toHaveLength(2)
  })

  it('appends a new blank expense defaulting to the other category', async () => {
    const onChange = vi.fn()
    render(<ExpenseList expenses={[]} onChange={onChange} mortgageMonthly={0} />)
    await userEvent.click(screen.getByRole('button', { name: 'Add expense' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    const [newExpenses] = onChange.mock.calls[0]
    expect(newExpenses).toHaveLength(1)
    expect(newExpenses[0]).toMatchObject({
      name: '',
      amount: 0,
      frequency: 'monthly',
      category: 'other',
    })
  })

  it('removes an expense when its remove button is clicked', async () => {
    const onChange = vi.fn()
    render(<ExpenseList expenses={expenses} onChange={onChange} mortgageMonthly={0} />)
    await userEvent.click(screen.getAllByRole('button', { name: 'Remove expense' })[0])
    expect(onChange).toHaveBeenCalledWith([expenses[1]])
  })
})

describe('ExpenseList pinned mortgage row', () => {
  it('shows the mortgage repayment as a pinned row that cannot be removed', () => {
    render(<ExpenseList expenses={expenses} onChange={() => {}} mortgageMonthly={2500} />)
    expect(screen.getByText('Mortgage repayment')).toBeInTheDocument()
    expect(screen.getByText('$2,500.00')).toBeInTheDocument()
    // Two editable expenses, so exactly two remove buttons — the mortgage row has none
    expect(screen.getAllByRole('button', { name: 'Remove expense' })).toHaveLength(2)
  })

  it('links the pinned row back to the mortgage tool', () => {
    render(<ExpenseList expenses={[]} onChange={() => {}} mortgageMonthly={2500} />)
    expect(screen.getByRole('link', { name: /mortgage/i })).toHaveAttribute(
      'href',
      '/tools/mortgage',
    )
  })

  it('prompts to set up a mortgage when there is no repayment', () => {
    render(<ExpenseList expenses={[]} onChange={() => {}} mortgageMonthly={0} />)
    expect(screen.getByText(/set up your mortgage/i)).toBeInTheDocument()
    expect(screen.queryByText('Mortgage repayment')).not.toBeInTheDocument()
  })

  it('still shows the expense empty state alongside the pinned row', () => {
    render(<ExpenseList expenses={[]} onChange={() => {}} mortgageMonthly={2500} />)
    expect(screen.getByText('No expenses added yet.')).toBeInTheDocument()
  })
})
