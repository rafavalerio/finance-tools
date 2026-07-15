'use client'

import { Suspense, useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  MortgageForm,
  ExpenseList,
  ResultsSummary,
  PurchaseCostsCard,
} from '@/components/tools/mortgage'
import { AmortisationChart, ExpenseBreakdownChart } from '@/components/charts'
import {
  Button,
  Modal,
  ArrowLeftIcon,
  ShareIcon,
  ResetIcon,
  CheckIcon,
  CopyIcon,
} from '@/components/ui'
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

const EXPENSE_COLORS = [
  'rgb(139, 195, 156)', // green
  'rgb(147, 178, 212)', // blue
  'rgb(219, 182, 136)', // gold
  'rgb(198, 146, 184)', // purple
  'rgb(168, 198, 184)', // teal
  'rgb(212, 163, 156)', // coral
  'rgb(176, 176, 168)', // gray
]

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

function MortgageCalculatorContent() {
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
        color: 'rgb(217, 119, 87)',
      },
    ]

    expenses.forEach((expense, index) => {
      if (expense.name && expense.amount > 0) {
        items.push({
          name: expense.name,
          value: convertToMonthly(expense.amount, expense.frequency),
          color: EXPENSE_COLORS[index % EXPENSE_COLORS.length],
        })
      }
    })

    return items
  }, [results, expenses])

  return (
    <>
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-muted hover:text-foreground transition-colors">
                <ArrowLeftIcon width="20" height="20" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Mortgage Calculator</h1>
                <p className="text-sm text-muted">
                  Plan your mortgage with Victorian stamp duty and purchase costs
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleShare} title="Share calculator">
                <ShareIcon width="16" height="16" className="mr-2" />
                Share
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                title="Reset form"
                className="text-muted hover:text-red-400"
              >
                <ResetIcon width="16" height="16" className="mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Inputs */}
          <div className="space-y-6">
            <MortgageForm inputs={inputs} onChange={setInputs} />
            <PurchaseCostsCard
              costs={purchaseCosts}
              deposit={inputs.deposit}
              propertyPrice={inputs.loanAmount}
            />
            <ExpenseList expenses={expenses} onChange={setExpenses} />
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            <ResultsSummary results={results} />
            <div className="grid grid-cols-1 gap-6">
              <AmortisationChart data={results?.amortisationSchedule || []} />
              <ExpenseBreakdownChart data={expenseBreakdownData} />
            </div>
          </div>
        </div>
      </main>

      {/* Share Modal */}
      <Modal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Share Calculator"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Share this link to let others see your mortgage calculation with all the details
            pre-filled.
          </p>

          {/* URL Display */}
          <div className="relative">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className={`
                w-full px-4 py-3 pr-24 bg-background border border-border rounded-lg
                text-sm text-foreground font-mono truncate
              `}
            />
            <Button
              variant={copied ? 'primary' : 'secondary'}
              size="sm"
              onClick={handleCopy}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              {copied ? (
                <>
                  <CheckIcon width="14" height="14" className="mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <CopyIcon width="14" height="14" className="mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>

          {/* Info */}
          <p className="text-xs text-muted">
            The link contains all your inputs encoded. No data is stored on any server.
          </p>
        </div>
      </Modal>
    </>
  )
}

// Loading fallback for Suspense
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div
          className={`
            w-8 h-8 border-2 border-accent border-t-transparent
            rounded-full animate-spin mx-auto mb-4
          `}
        />
        <p className="text-muted">Loading calculator...</p>
      </div>
    </div>
  )
}

export default function MortgageCalculatorPage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<LoadingFallback />}>
        <MortgageCalculatorContent />
      </Suspense>
    </div>
  )
}
