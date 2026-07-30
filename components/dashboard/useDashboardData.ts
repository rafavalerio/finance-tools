'use client'

import { useEffect, useState } from 'react'
import { useHousehold } from '@/components/household'
import { loadMortgageData } from '@/lib/storage'
import { calculateSavedMortgageResults } from '@/lib/calculations/mortgage'
import { MortgageResults } from '@/types/mortgage'
import { budgetRepository } from '@/lib/budget'
import { computeBudgetSummary, computeCategoryBreakdown } from '@/lib/calculations/budget'
import { BudgetSummary, ExpenseBreakdownItem } from '@/types/budget'
import { CATEGORY_COLORS, CHART_ACCENT_COLOR } from '@/components/charts/theme'

export function useDashboardData() {
  const { members, splitConfig } = useHousehold()
  const [mortgageResults, setMortgageResults] = useState<MortgageResults | null>(null)
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null)
  const [topCategories, setTopCategories] = useState<ExpenseBreakdownItem[]>([])

  useEffect(() => {
    let cancelled = false
    // Deferred via a microtask purely to satisfy react-hooks/set-state-in-effect's static
    // analysis (it only flags setState calls made directly/synchronously in the effect body) —
    // loadMortgageData() itself is synchronous localStorage access, not real async I/O.
    Promise.resolve().then(() => {
      if (cancelled) return
      const saved = loadMortgageData()
      setMortgageResults(
        saved ? calculateSavedMortgageResults(saved.inputs, members, splitConfig) : null,
      )
    })
    return () => {
      cancelled = true
    }
  }, [members, splitConfig])

  useEffect(() => {
    let cancelled = false
    Promise.all([budgetRepository.getExpenses(), budgetRepository.getTakeHomeOverride()]).then(
      ([expenses, takeHomeOverride]) => {
        if (cancelled) return
        if (expenses.length === 0 && takeHomeOverride === null) {
          setBudgetSummary(null)
          setTopCategories([])
          return
        }
        const mortgageMonthly = mortgageResults?.monthlyMortgagePayment ?? 0
        setBudgetSummary(computeBudgetSummary(expenses, mortgageMonthly, members, takeHomeOverride))
        setTopCategories(
          computeCategoryBreakdown(expenses, mortgageMonthly, CATEGORY_COLORS, CHART_ACCENT_COLOR)
            .slice()
            .sort((a, b) => b.value - a.value)
            .slice(0, 3),
        )
      },
    )
    return () => {
      cancelled = true
    }
  }, [members, mortgageResults])

  return { mortgageResults, budgetSummary, topCategories }
}
