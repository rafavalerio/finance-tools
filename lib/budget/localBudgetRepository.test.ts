import { describe, it, expect, beforeEach } from 'vitest'
import { LocalBudgetRepository } from './localBudgetRepository'
import { Expense } from '@/types/budget'

const EXPENSES_KEY = 'finance-tools-budget-expenses'
const TAKE_HOME_KEY = 'finance-tools-budget-take-home'
const LEGACY_KEY = 'finance-tools-mortgage-expenses'

const expenses: Expense[] = [
  { id: '1', name: 'Rates', amount: 300, frequency: 'quarterly', category: 'housing' },
  { id: '2', name: 'Power', amount: 180, frequency: 'monthly', category: 'utilities' },
]

beforeEach(() => {
  localStorage.clear()
})

describe('LocalBudgetRepository expenses', () => {
  it('returns an empty array when nothing has been saved', async () => {
    const repo = new LocalBudgetRepository()
    expect(await repo.getExpenses()).toEqual([])
  })

  it('round-trips expenses through localStorage', async () => {
    const repo = new LocalBudgetRepository()
    await repo.saveExpenses(expenses)
    expect(await repo.getExpenses()).toEqual(expenses)
  })

  it('returns an empty array if the stored value is corrupt', async () => {
    localStorage.setItem(EXPENSES_KEY, 'not-json')
    const repo = new LocalBudgetRepository()
    expect(await repo.getExpenses()).toEqual([])
  })
})

describe('LocalBudgetRepository take-home override', () => {
  it('returns null when no override has been saved', async () => {
    const repo = new LocalBudgetRepository()
    expect(await repo.getTakeHomeOverride()).toBeNull()
  })

  it('round-trips an override through localStorage', async () => {
    const repo = new LocalBudgetRepository()
    await repo.saveTakeHomeOverride(9000)
    expect(await repo.getTakeHomeOverride()).toBe(9000)
  })

  it('round-trips an override of zero without treating it as unset', async () => {
    const repo = new LocalBudgetRepository()
    await repo.saveTakeHomeOverride(0)
    expect(await repo.getTakeHomeOverride()).toBe(0)
  })

  it('clears the override when null is saved', async () => {
    const repo = new LocalBudgetRepository()
    await repo.saveTakeHomeOverride(9000)
    await repo.saveTakeHomeOverride(null)
    expect(await repo.getTakeHomeOverride()).toBeNull()
    expect(localStorage.getItem(TAKE_HOME_KEY)).toBeNull()
  })

  it('returns null if the stored override is corrupt', async () => {
    localStorage.setItem(TAKE_HOME_KEY, 'not-json')
    const repo = new LocalBudgetRepository()
    expect(await repo.getTakeHomeOverride()).toBeNull()
  })
})

describe('LocalBudgetRepository legacy mortgage-expense migration', () => {
  const legacy = [
    { id: 'x', name: 'Rates', amount: 300, frequency: 'quarterly' },
    { id: 'y', name: 'Power', amount: 180, frequency: 'monthly' },
  ]

  it('imports legacy mortgage expenses as "other" and removes the legacy key', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(legacy))
    const repo = new LocalBudgetRepository()

    const result = await repo.getExpenses()
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ name: 'Rates', amount: 300, frequency: 'quarterly' })
    expect(result.every((expense) => expense.category === 'other')).toBe(true)

    expect(localStorage.getItem(LEGACY_KEY)).toBeNull()
    expect(JSON.parse(localStorage.getItem(EXPENSES_KEY)!)).toHaveLength(2)
  })

  it('does not migrate when budget expenses already exist', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(legacy))
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses))
    const repo = new LocalBudgetRepository()

    expect(await repo.getExpenses()).toEqual(expenses)
    expect(localStorage.getItem(LEGACY_KEY)).not.toBeNull()
  })

  it('does not re-migrate after the first call', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(legacy))
    const repo = new LocalBudgetRepository()

    await repo.getExpenses()
    await repo.saveExpenses([])
    expect(await repo.getExpenses()).toEqual([])
  })

  it('discards a corrupt legacy value and still removes the key', async () => {
    localStorage.setItem(LEGACY_KEY, 'not-json')
    const repo = new LocalBudgetRepository()

    expect(await repo.getExpenses()).toEqual([])
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull()
  })

  it('handles an empty legacy array without writing a budget key', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([]))
    const repo = new LocalBudgetRepository()

    expect(await repo.getExpenses()).toEqual([])
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull()
  })
})
