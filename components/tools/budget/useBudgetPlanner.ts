'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Expense } from '@/types/budget'
import { budgetRepository } from '@/lib/budget'
import { useHousehold } from '@/components/household'
import { loadMortgageData } from '@/lib/storage'
import { calculateSavedMortgageResults } from '@/lib/calculations/mortgage'
import {
  computeBudgetSummary,
  computeCategoryBreakdown,
  computeMemberBudgetShares,
  computeMonthlyIncome,
} from '@/lib/calculations/budget'
import { CATEGORY_COLORS, CHART_ACCENT_COLOR } from '@/components/charts/theme'

export function useBudgetPlanner() {
  const { members, splitConfig, isLoaded: householdLoaded } = useHousehold()
  const [expenses, setExpensesState] = useState<Expense[]>([])
  const [takeHomeOverride, setTakeHomeOverrideState] = useState<number | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load persisted budget data on mount. The setState calls are deferred into the promise
  // chain, which also satisfies react-hooks/set-state-in-effect.
  useEffect(() => {
    let cancelled = false
    Promise.all([budgetRepository.getExpenses(), budgetRepository.getTakeHomeOverride()]).then(
      ([loadedExpenses, loadedOverride]) => {
        if (cancelled) return
        setExpensesState(loadedExpenses)
        setTakeHomeOverrideState(loadedOverride)
        setIsLoaded(true)
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  const setExpenses = useCallback((next: Expense[]) => {
    setExpensesState(next)
    budgetRepository.saveExpenses(next)
  }, [])

  const setTakeHomeOverride = useCallback((next: number | null) => {
    setTakeHomeOverrideState(next)
    budgetRepository.saveTakeHomeOverride(next)
  }, [])

  // The mortgage repayment is read one-way from the mortgage tool's own storage —
  // the mortgage tool has no knowledge of the budget.
  const mortgageMonthly = useMemo(() => {
    if (!householdLoaded) return 0
    const saved = loadMortgageData()
    if (!saved) return 0
    const results = calculateSavedMortgageResults(saved.inputs, members, splitConfig)
    return results?.monthlyMortgagePayment ?? 0
  }, [householdLoaded, members, splitConfig])

  const grossMonthlyIncome = useMemo(() => computeMonthlyIncome(members, null), [members])

  const summary = useMemo(
    () => computeBudgetSummary(expenses, mortgageMonthly, members, takeHomeOverride),
    [expenses, mortgageMonthly, members, takeHomeOverride],
  )

  const breakdownData = useMemo(
    () => computeCategoryBreakdown(expenses, mortgageMonthly, CATEGORY_COLORS, CHART_ACCENT_COLOR),
    [expenses, mortgageMonthly],
  )

  const memberShares = useMemo(
    () =>
      computeMemberBudgetShares(members, splitConfig, takeHomeOverride, summary.monthlyExpenses),
    [members, splitConfig, takeHomeOverride, summary.monthlyExpenses],
  )

  return {
    expenses,
    setExpenses,
    takeHomeOverride,
    setTakeHomeOverride,
    grossMonthlyIncome,
    mortgageMonthly,
    summary,
    breakdownData,
    memberShares,
    hasMembers: members.length > 0,
    isLoaded: isLoaded && householdLoaded,
  }
}
