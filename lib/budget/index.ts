import { BudgetRepository } from './repository'
import { LocalBudgetRepository } from './localBudgetRepository'

export const budgetRepository: BudgetRepository = new LocalBudgetRepository()
export type { BudgetRepository }
