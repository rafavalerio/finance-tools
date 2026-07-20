'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { MortgageInputs, Expense, ExpenseBreakdownItem, SplitSnapshotEntry } from '@/types/mortgage'
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
import { useHousehold } from '@/components/household'
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
  splitMemberIds: [],
  splitMode: 'even',
}

export function useMortgageCalculator() {
  const searchParams = useSearchParams()
  const { members, isLoaded: isHouseholdLoaded } = useHousehold()
  const [inputs, setInputsState] = useState<MortgageInputs>(DEFAULT_INPUTS)
  const [expenses, setExpensesState] = useState<Expense[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [sharedSplitSnapshot, setSharedSplitSnapshot] = useState<SplitSnapshotEntry[] | null>(null)
  const [hadSavedMortgageData, setHadSavedMortgageData] = useState(false)
  const hasSeededSplitRef = useRef(false)

  // Load data from URL params or localStorage on mount
  useEffect(() => {
    const urlData = searchParams.get('data')

    if (urlData) {
      const decoded = decodeMortgageData(urlData)
      if (decoded) {
        setInputsState(decoded.inputs)
        setExpensesState(decoded.expenses)
        setSharedSplitSnapshot(decoded.splitSnapshot)
        setHadSavedMortgageData(true)
        setIsLoaded(true)
        return
      }
    }

    const savedData = loadMortgageData()
    if (savedData) {
      setInputsState(savedData.inputs)
      setExpensesState(savedData.expenses)
      setHadSavedMortgageData(true)
    }
    setIsLoaded(true)
  }, [searchParams])

  // Default to splitting between every household member the first time the mortgage tool is
  // used with no prior saved data — matches the household-profile design spec. Guarded by a
  // ref so it fires at most once and never re-applies after a later manual deselection (e.g.
  // after Reset, splitMemberIds intentionally stays empty rather than re-seeding).
  useEffect(() => {
    if (
      !hasSeededSplitRef.current &&
      isLoaded &&
      isHouseholdLoaded &&
      !hadSavedMortgageData &&
      members.length >= 2 &&
      inputs.splitMemberIds.length === 0
    ) {
      hasSeededSplitRef.current = true
      setInputsState((current) => ({
        ...current,
        splitMemberIds: members.map((member) => member.id),
      }))
    }
  }, [isLoaded, isHouseholdLoaded, hadSavedMortgageData, members, inputs.splitMemberIds])

  // Save to localStorage whenever inputs or expenses change
  useEffect(() => {
    if (isLoaded) {
      saveMortgageData({ inputs, expenses })
    }
  }, [inputs, expenses, isLoaded])

  // Wrapped setters: any user-driven edit invalidates a shared split snapshot, so the
  // display falls back to the live calculation from the user's own household
  const setInputs = useCallback((next: MortgageInputs) => {
    setInputsState(next)
    setSharedSplitSnapshot(null)
  }, [])

  const setExpenses = useCallback((next: Expense[]) => {
    setExpensesState(next)
    setSharedSplitSnapshot(null)
  }, [])

  // Reset form handler
  const handleReset = useCallback(() => {
    if (confirm('Are you sure you want to reset the form? This will clear all your data.')) {
      setInputsState(DEFAULT_INPUTS)
      setExpensesState([])
      setSharedSplitSnapshot(null)
      clearMortgageData()
      window.history.replaceState({}, '', '/tools/mortgage')
    }
  }, [])

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
      const adjustedInputs = {
        ...inputs,
        deposit: purchaseCosts?.effectiveDeposit ?? inputs.deposit,
      }
      return calculateMortgageResults(adjustedInputs, expenses, members)
    }
    return null
  }, [inputs, expenses, purchaseCosts, members])

  // Share handler - snapshots the current split breakdown by name, not member ID
  const handleShare = useCallback(() => {
    const snapshot: SplitSnapshotEntry[] | undefined = results
      ? results.splitBreakdown.map(({ name, amount }) => ({ name, amount }))
      : undefined
    const url = generateShareUrl({ inputs, expenses }, snapshot)
    setShareUrl(url)
    setShowShareModal(true)
    setCopied(false)
  }, [inputs, expenses, results])

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

  // A frozen share snapshot (if present and unedited) takes priority over the live split
  const displaySplitBreakdown: SplitSnapshotEntry[] =
    sharedSplitSnapshot ??
    results?.splitBreakdown.map(({ name, amount }) => ({ name, amount })) ??
    []

  return {
    inputs,
    setInputs,
    expenses,
    setExpenses,
    members,
    showShareModal,
    setShowShareModal,
    shareUrl,
    copied,
    handleReset,
    handleShare,
    handleCopy,
    purchaseCosts,
    results,
    displaySplitBreakdown,
    expenseBreakdownData,
  }
}
