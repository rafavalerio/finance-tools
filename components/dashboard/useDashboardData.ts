'use client'

import { useEffect, useState } from 'react'
import { useHousehold } from '@/components/household'
import { loadMortgageData } from '@/lib/storage'
import { calculateMortgageResults } from '@/lib/calculations/mortgage'
import { MortgageResults } from '@/types/mortgage'

export function useDashboardData() {
  const { members } = useHousehold()
  const [mortgageResults, setMortgageResults] = useState<MortgageResults | null>(null)

  useEffect(() => {
    const saved = loadMortgageData()
    if (saved && saved.inputs.loanAmount > 0) {
      setMortgageResults(calculateMortgageResults(saved.inputs, saved.expenses, members))
    } else {
      setMortgageResults(null)
    }
  }, [members])

  return { members, mortgageResults }
}
