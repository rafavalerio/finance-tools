'use client'

import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { Expense } from '@/types/mortgage'
import { ExpenseItem } from './ExpenseItem'

interface ExpenseListProps {
  expenses: Expense[]
  onChange: (expenses: Expense[]) => void
}

export function ExpenseList({ expenses, onChange }: ExpenseListProps) {
  const addExpense = () => {
    const newExpense: Expense = {
      id: crypto.randomUUID(),
      name: '',
      amount: 0,
      frequency: 'monthly',
    }
    onChange([...expenses, newExpense])
  }

  const updateExpense = (index: number, expense: Expense) => {
    const updated = [...expenses]
    updated[index] = expense
    onChange(updated)
  }

  const removeExpense = (index: number) => {
    const updated = expenses.filter((_, i) => i !== index)
    onChange(updated)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Additional Expenses</CardTitle>
          <Button variant="secondary" size="sm" onClick={addExpense}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            Add Expense
          </Button>
        </div>
        <p className="text-sm text-muted mt-1">
          Add recurring expenses like council rates, utilities, insurance, etc.
        </p>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <div className="text-center py-8 text-muted">
            <p>No additional expenses added yet.</p>
            <p className="text-sm mt-1">Click &ldquo;Add Expense&rdquo; to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {expenses.map((expense, index) => (
              <ExpenseItem
                key={expense.id}
                expense={expense}
                onChange={(updated) => updateExpense(index, updated)}
                onRemove={() => removeExpense(index)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
