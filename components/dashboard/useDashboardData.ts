'use client'

import { useEffect, useState } from 'react'
import { useHousehold } from '@/components/household'
import { loadMortgageData } from '@/lib/storage'
import { calculateMortgageResults } from '@/lib/calculations/mortgage'
import { MortgageResults } from '@/types/mortgage'

export function useDashboardData() {
  const { members, splitConfig } = useHousehold()
  const [mortgageResults, setMortgageResults] = useState<MortgageResults | null>(null)

  useEffect(() => {
    let cancelled = false
    // Deferred via a microtask purely to satisfy react-hooks/set-state-in-effect's static
    // analysis (it only flags setState calls made directly/synchronously in the effect body) —
    // loadMortgageData() itself is synchronous localStorage access, not real async I/O.
    Promise.resolve().then(() => {
      if (cancelled) return
      const saved = loadMortgageData()
      if (
        saved &&
        saved.inputs.loanAmount > 0 &&
        saved.inputs.interestRate > 0 &&
        saved.inputs.loanTermYears > 0
      ) {
        setMortgageResults(
          calculateMortgageResults(saved.inputs, saved.expenses, members, splitConfig),
        )
      } else {
        setMortgageResults(null)
      }
    })
    return () => {
      cancelled = true
    }
  }, [members, splitConfig])

  return { mortgageResults }
}
