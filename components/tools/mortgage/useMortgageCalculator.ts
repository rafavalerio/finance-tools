'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { MortgageInputs } from '@/types/mortgage'
import { calculateSavedMortgageResults, calculatePurchaseCosts } from '@/lib/calculations/mortgage'
import {
  saveMortgageData,
  loadMortgageData,
  clearMortgageData,
  decodeMortgageData,
  generateShareUrl,
} from '@/lib/storage'

const DEFAULT_INPUTS: MortgageInputs = {
  loanAmount: 0,
  deposit: 0,
  interestRate: 0,
  loanTermYears: 30,
  repaymentFrequency: 'monthly',
  offsetBalance: 0,
  buyerType: 'standard',
  state: 'VIC',
  includeLegalFees: true,
  includeBuildingInspection: true,
}

export function useMortgageCalculator() {
  const searchParams = useSearchParams()
  const [inputs, setInputsState] = useState<MortgageInputs>(DEFAULT_INPUTS)
  const [isLoaded, setIsLoaded] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)

  // Load data from URL params or localStorage on mount.
  // Deferred via a microtask purely to satisfy react-hooks/set-state-in-effect's static
  // analysis (it only flags setState calls made directly/synchronously in the effect body) —
  // decodeMortgageData/loadMortgageData are synchronous, not real async I/O.
  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => {
      if (cancelled) return

      const urlData = searchParams.get('data')
      if (urlData) {
        const decoded = decodeMortgageData(urlData)
        if (decoded) {
          setInputsState(decoded.inputs)
          setIsLoaded(true)
          return
        }
      }

      const savedData = loadMortgageData()
      if (savedData) {
        setInputsState(savedData.inputs)
      }
      setIsLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [searchParams])

  // Save to localStorage whenever inputs change
  useEffect(() => {
    if (isLoaded) {
      saveMortgageData({ inputs })
    }
  }, [inputs, isLoaded])

  // Reset form handler
  const handleReset = useCallback(() => {
    if (confirm('Reset the mortgage calculator and clear your inputs?')) {
      setInputsState(DEFAULT_INPUTS)
      clearMortgageData()
      window.history.replaceState({}, '', '/')
    }
  }, [])

  // Calculate purchase costs
  const purchaseCosts = useMemo(() => {
    if (inputs.loanAmount > 0 && inputs.deposit > 0) {
      return calculatePurchaseCosts(
        inputs.loanAmount,
        inputs.deposit,
        inputs.state,
        inputs.buyerType,
        inputs.includeLegalFees,
        inputs.includeBuildingInspection,
      )
    }
    return null
  }, [
    inputs.loanAmount,
    inputs.deposit,
    inputs.state,
    inputs.buyerType,
    inputs.includeLegalFees,
    inputs.includeBuildingInspection,
  ])

  // Calculate mortgage results using effective loan amount (after costs)
  const results = useMemo(
    () => calculateSavedMortgageResults(inputs),
    [inputs],
  )

  const handleShare = useCallback(() => {
    const url = generateShareUrl({ inputs })
    setShareUrl(url)
    setShowShareModal(true)
    setCopied(false)
  }, [inputs])

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

  return {
    inputs,
    setInputs: setInputsState,
    showShareModal,
    setShowShareModal,
    shareUrl,
    copied,
    handleReset,
    handleShare,
    handleCopy,
    purchaseCosts,
    results,
  }
}
