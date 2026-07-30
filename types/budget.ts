export type ExpenseFrequency = 'monthly' | 'quarterly' | 'annually'

export type ExpenseCategory =
  | 'housing'
  | 'utilities'
  | 'insurance'
  | 'transport'
  | 'groceries'
  | 'health'
  | 'entertainment'
  | 'other'

export interface Expense {
  id: string
  name: string
  amount: number
  frequency: ExpenseFrequency
  category: ExpenseCategory
}

export interface ExpenseBreakdownItem {
  name: string
  value: number
  color: string
}

export interface BudgetSummary {
  monthlyIncome: number
  monthlyExpenses: number
  surplus: number
}

export interface MemberBudgetShare {
  memberId: string
  name: string
  /** Dollar amount of total monthly outgoing, not a ratio */
  share: number
  monthlyIncome: number
  leftover: number
}
