'use client'

import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  PlusIcon,
  ListChecksIcon,
} from '@/components/ui'
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
      <CardHeader
        actions={
          <Button variant="secondary" size="sm" onClick={addExpense}>
            <PlusIcon width="16" height="16" className="mr-2" />
            Add Expense
          </Button>
        }
      >
        <CardTitle className="flex items-center gap-2">
          <ListChecksIcon width="20" height="20" className="text-accent" />
          Additional Expenses
        </CardTitle>
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
