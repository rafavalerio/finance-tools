import { Expense } from '@/types/budget'
import { BudgetRepository } from './repository'

const EXPENSES_KEY = 'finance-tools-budget-expenses'
const TAKE_HOME_KEY = 'finance-tools-budget-take-home'
// Expenses used to live in the mortgage tool. Read once on first budget load, then removed.
const LEGACY_MORTGAGE_EXPENSES_KEY = 'finance-tools-mortgage-expenses'

export class LocalBudgetRepository implements BudgetRepository {
  async getExpenses(): Promise<Expense[]> {
    try {
      const json = localStorage.getItem(EXPENSES_KEY)
      if (json) return JSON.parse(json)
      return this.migrateLegacyExpenses()
    } catch (error) {
      console.error('Failed to load budget expenses from localStorage:', error)
      return []
    }
  }

  async saveExpenses(expenses: Expense[]): Promise<void> {
    try {
      localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses))
    } catch (error) {
      console.error('Failed to save budget expenses to localStorage:', error)
    }
  }

  async getTakeHomeOverride(): Promise<number | null> {
    try {
      const json = localStorage.getItem(TAKE_HOME_KEY)
      if (json === null) return null
      const parsed = JSON.parse(json)
      return typeof parsed === 'number' ? parsed : null
    } catch (error) {
      console.error('Failed to load take-home override from localStorage:', error)
      return null
    }
  }

  async saveTakeHomeOverride(value: number | null): Promise<void> {
    try {
      if (value === null) {
        localStorage.removeItem(TAKE_HOME_KEY)
      } else {
        localStorage.setItem(TAKE_HOME_KEY, JSON.stringify(value))
      }
    } catch (error) {
      console.error('Failed to save take-home override to localStorage:', error)
    }
  }

  /**
   * One-time import of expenses saved by the old mortgage tool. Only runs when no budget
   * expenses exist, so it can never overwrite data the user has since edited. The legacy
   * key is removed once the migrated data has been written — including when its contents
   * are unusable and there is nothing to write — so a bad value cannot make this run again
   * on every load.
   */
  private migrateLegacyExpenses(): Expense[] {
    const legacyJson = localStorage.getItem(LEGACY_MORTGAGE_EXPENSES_KEY)
    if (legacyJson === null) return []

    let migrated: Expense[] = []
    try {
      const parsed = JSON.parse(legacyJson)
      if (Array.isArray(parsed)) {
        migrated = parsed.map((expense) => ({
          id: expense.id ?? crypto.randomUUID(),
          name: expense.name ?? '',
          amount: expense.amount ?? 0,
          frequency: expense.frequency ?? 'monthly',
          category: 'other' as const,
        }))
      }
    } catch (error) {
      console.error('Failed to migrate legacy mortgage expenses:', error)
    }

    // Write the migrated data BEFORE dropping the legacy key: if setItem throws (quota
    // exceeded, Safari private mode) the legacy key survives and the migration can retry on a
    // later load rather than the expenses being lost. When there is nothing to write (empty or
    // corrupt legacy value) removal is unconditionally safe.
    if (migrated.length > 0) {
      localStorage.setItem(EXPENSES_KEY, JSON.stringify(migrated))
    }
    localStorage.removeItem(LEGACY_MORTGAGE_EXPENSES_KEY)
    return migrated
  }
}
