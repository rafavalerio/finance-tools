'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { MortgageInputs, Expense, ExpenseBreakdownItem } from '@/types/mortgage'
import {
  calculateMortgageResults,
  calculatePurchaseCosts,
  convertToMonthly,
} from '@/lib/calculations/mortgage'
import {
  saveMortgageData,
  loadMortgageData,
  clearMortgageData,
  decodeMortgageData,
  generateShareUrl,
} from '@/lib/storage'
import { CHART_ACCENT_COLOR, CHART_PALETTE } from '@/components/charts/theme'

const DEFAULT_INPUTS: MortgageInputs = {
  loanAmount: 0,
  deposit: 0,
  interestRate: 0,
  loanTermYears: 30,
  repaymentFrequency: 'monthly',
  offsetBalance: 0,
  buyerType: 'standard',
  includeLegalFees: true,
  includeBuildingInspection: true,
}

export function useMortgageCalculator() {
  const searchParams = useSearchParams()
  const [inputs, setInputs] = useState<MortgageInputs>(DEFAULT_INPUTS)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)

  // Load data from URL params or localStorage on mount
  useEffect(() => {
    const urlData = searchParams.get('data')

    if (urlData) {
      // Try to decode URL data first
      const decoded = decodeMortgageData(urlData)
      if (decoded) {
        setInputs(decoded.inputs)
        setExpenses(decoded.expenses)
        setIsLoaded(true)
        return
      }
    }

    // Fall back to localStorage
    const savedData = loadMortgageData()
    if (savedData) {
      setInputs(savedData.inputs)
      setExpenses(savedData.expenses)
    }
    setIsLoaded(true)
  }, [searchParams])

  // Save to localStorage whenever inputs or expenses change
  useEffect(() => {
    if (isLoaded) {
      saveMortgageData({ inputs, expenses })
    }
  }, [inputs, expenses, isLoaded])

  // Reset form handler
  const handleReset = useCallback(() => {
    if (confirm('Are you sure you want to reset the form? This will clear all your data.')) {
      setInputs(DEFAULT_INPUTS)
      setExpenses([])
      clearMortgageData()
      // Clear URL params
      window.history.replaceState({}, '', '/tools/mortgage')
    }
  }, [])

  // Share handler
  const handleShare = useCallback(() => {
    const url = generateShareUrl({ inputs, expenses })
    setShareUrl(url)
    setShowShareModal(true)
    setCopied(false)
  }, [inputs, expenses])

  // Copy to clipboard handler
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }, [shareUrl])

  // Calculate purchase costs
  const purchaseCosts = useMemo(() => {
    if (inputs.loanAmount > 0 && inputs.deposit > 0) {
      return calculatePurchaseCosts(
        inputs.loanAmount,
        inputs.deposit,
        inputs.buyerType,
        inputs.includeLegalFees,
        inputs.includeBuildingInspection,
      )
    }
    return null
  }, [
    inputs.loanAmount,
    inputs.deposit,
    inputs.buyerType,
    inputs.includeLegalFees,
    inputs.includeBuildingInspection,
  ])

  // Calculate mortgage results using effective loan amount (after costs)
  const results = useMemo(() => {
    if (inputs.loanAmount > 0 && inputs.interestRate > 0 && inputs.loanTermYears > 0) {
      // Create adjusted inputs using effective deposit (after purchase costs)
      const adjustedInputs = {
        ...inputs,
        deposit: purchaseCosts?.effectiveDeposit ?? inputs.deposit,
      }
      return calculateMortgageResults(adjustedInputs, expenses)
    }
    return null
  }, [inputs, expenses, purchaseCosts])

  const expenseBreakdownData = useMemo<ExpenseBreakdownItem[]>(() => {
    if (!results) return []

    const items: ExpenseBreakdownItem[] = [
      {
        name: 'Mortgage',
        value: results.monthlyMortgagePayment,
        color: CHART_ACCENT_COLOR,
      },
    ]

    expenses.forEach((expense, index) => {
      if (expense.name && expense.amount > 0) {
        items.push({
          name: expense.name,
          value: convertToMonthly(expense.amount, expense.frequency),
          color: CHART_PALETTE[index % CHART_PALETTE.length],
        })
      }
    })

    return items
  }, [results, expenses])

  return {
    inputs,
    setInputs,
    expenses,
    setExpenses,
    showShareModal,
    setShowShareModal,
    shareUrl,
    copied,
    handleReset,
    handleShare,
    handleCopy,
    purchaseCosts,
    results,
    expenseBreakdownData,
  }
}
