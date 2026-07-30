import { Expense } from '@/types/budget'

export interface BudgetRepository {
  getExpenses(): Promise<Expense[]>
  saveExpenses(expenses: Expense[]): Promise<void>
  getTakeHomeOverride(): Promise<number | null>
  saveTakeHomeOverride(value: number | null): Promise<void>
}
