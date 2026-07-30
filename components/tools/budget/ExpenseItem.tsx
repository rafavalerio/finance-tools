'use client'

import { Input, Select, Button, TrashIcon } from '@/components/ui'
import { Expense, ExpenseFrequency, ExpenseCategory } from '@/types/budget'
import { EXPENSE_CATEGORIES } from '@/lib/calculations/budget'

interface ExpenseItemProps {
  expense: Expense
  onChange: (expense: Expense) => void
  onRemove: () => void
}

const frequencyOptions = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
]

const categoryOptions = EXPENSE_CATEGORIES.map((category) => ({
  value: category.value,
  label: category.label,
}))

export function ExpenseItem({ expense, onChange, onRemove }: ExpenseItemProps) {
  const handleChange = (field: keyof Expense, value: string | number) => {
    onChange({
      ...expense,
      [field]: value,
    })
  }

  return (
    <div
      className={`
        flex flex-col sm:flex-row gap-3 items-start sm:items-end
        p-4 bg-background rounded-lg border border-border
      `}
    >
      <div className="flex-1 w-full sm:w-auto">
        <Input
          id={`expense-name-${expense.id}`}
          label="Expense Name"
          type="text"
          placeholder="e.g., Council Rates"
          value={expense.name}
          onChange={(e) => handleChange('name', e.target.value)}
        />
      </div>
      <div className="w-full sm:w-40">
        <Input
          id={`expense-amount-${expense.id}`}
          label="Amount"
          type="number"
          prefix="$"
          placeholder="0"
          value={expense.amount || ''}
          onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
        />
      </div>
      <div className="w-full sm:w-40">
        <Select
          id={`expense-category-${expense.id}`}
          label="Category"
          options={categoryOptions}
          value={expense.category}
          onChange={(e) => handleChange('category', e.target.value as ExpenseCategory)}
        />
      </div>
      <div className="w-full sm:w-36">
        <Select
          id={`expense-frequency-${expense.id}`}
          label="Frequency"
          options={frequencyOptions}
          value={expense.frequency}
          onChange={(e) => handleChange('frequency', e.target.value as ExpenseFrequency)}
        />
      </div>
      <Button
        variant="ghost"
        size="md"
        onClick={onRemove}
        className="text-red-400 hover:text-red-300 hover:bg-red-400/10 mt-2 sm:mt-0"
        aria-label="Remove expense"
      >
        <TrashIcon width="20" height="20" />
      </Button>
    </div>
  )
}
