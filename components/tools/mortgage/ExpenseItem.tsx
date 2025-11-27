"use client";

import { Input, Select, Button } from "@/components/ui";
import { Expense, ExpenseFrequency } from "@/types/mortgage";

interface ExpenseItemProps {
  expense: Expense;
  onChange: (expense: Expense) => void;
  onRemove: () => void;
}

const frequencyOptions = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
];

export function ExpenseItem({ expense, onChange, onRemove }: ExpenseItemProps) {
  const handleChange = (field: keyof Expense, value: string | number) => {
    onChange({
      ...expense,
      [field]: value,
    });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end p-4 bg-background rounded-lg border border-border">
      <div className="flex-1 w-full sm:w-auto">
        <Input
          label="Expense Name"
          type="text"
          placeholder="e.g., Council Rates"
          value={expense.name}
          onChange={(e) => handleChange("name", e.target.value)}
        />
      </div>
      <div className="w-full sm:w-40">
        <Input
          label="Amount"
          type="number"
          prefix="$"
          placeholder="0"
          value={expense.amount || ""}
          onChange={(e) => handleChange("amount", parseFloat(e.target.value) || 0)}
        />
      </div>
      <div className="w-full sm:w-36">
        <Select
          label="Frequency"
          options={frequencyOptions}
          value={expense.frequency}
          onChange={(e) => handleChange("frequency", e.target.value as ExpenseFrequency)}
        />
      </div>
      <Button
        variant="ghost"
        size="md"
        onClick={onRemove}
        className="text-red-400 hover:text-red-300 hover:bg-red-400/10 mt-2 sm:mt-0"
        aria-label="Remove expense"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          <line x1="10" x2="10" y1="11" y2="17" />
          <line x1="14" x2="14" y1="11" y2="17" />
        </svg>
      </Button>
    </div>
  );
}

