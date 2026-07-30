'use client'

import Link from 'next/link'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  PlusIcon,
  ListChecksIcon,
  HouseIcon,
} from '@/components/ui'
import { Expense } from '@/types/budget'
import { formatCurrencyPrecise } from '@/lib/calculations/format'
import { ExpenseItem } from './ExpenseItem'

interface ExpenseListProps {
  expenses: Expense[]
  onChange: (expenses: Expense[]) => void
  mortgageMonthly: number
}

export function ExpenseList({ expenses, onChange, mortgageMonthly }: ExpenseListProps) {
  const addExpense = () => {
    const newExpense: Expense = {
      id: crypto.randomUUID(),
      name: '',
      amount: 0,
      frequency: 'monthly',
      category: 'other',
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
          <Button
            variant="secondary"
            size="sm"
            onClick={addExpense}
            aria-label="Add expense"
            title="Add expense"
          >
            <PlusIcon width="16" height="16" />
          </Button>
        }
      >
        <CardTitle className="flex items-center gap-2">
          <ListChecksIcon width="20" height="20" className="text-accent" />
          Expenses
        </CardTitle>
        <p className="text-sm text-muted mt-1">
          Add recurring expenses like council rates, utilities, insurance, and groceries.
        </p>
      </CardHeader>
      <CardContent>
        {mortgageMonthly > 0 ? (
          <div
            className={`
              flex items-center justify-between gap-3 mb-3
              p-4 bg-accent/10 rounded-lg border border-accent/30
            `}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">Mortgage repayment</p>
              <p className="text-xs text-muted mt-0.5">Housing &middot; from your mortgage</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <p className="text-lg font-bold text-accent">
                {formatCurrencyPrecise(mortgageMonthly)}
              </p>
              <Link
                href="/tools/mortgage"
                aria-label="Edit mortgage"
                className="text-muted hover:text-accent transition-colors"
              >
                <HouseIcon width="18" height="18" />
              </Link>
            </div>
          </div>
        ) : (
          <div
            className={`
              flex items-center justify-between gap-3 mb-3
              p-4 bg-background rounded-lg border border-dashed border-border
            `}
          >
            <p className="text-sm text-muted">No mortgage repayment yet.</p>
            <Link href="/tools/mortgage" className="text-sm text-accent hover:underline shrink-0">
              Set up your mortgage
            </Link>
          </div>
        )}
        {expenses.length === 0 ? (
          <div className="text-center py-8 text-muted">
            <p>No expenses added yet.</p>
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
