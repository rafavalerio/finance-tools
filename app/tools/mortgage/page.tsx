'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import {
  MortgageForm,
  ExpenseList,
  ResultsSummary,
  PurchaseCostsCard,
  ShareModal,
  MortgageLoadingFallback,
  useMortgageCalculator,
} from '@/components/tools/mortgage'
import { AmortisationChart, ExpenseBreakdownChart } from '@/components/charts'
import { HeaderActions, ArrowLeftIcon, ShareIcon, ResetIcon } from '@/components/ui'
import { PageContainer } from '@/components/layout'

function MortgageCalculatorContent() {
  const {
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
  } = useMortgageCalculator()

  return (
    <>
      {/* Header */}
      <header className="border-b border-border">
        <PageContainer className="py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <Link
                href="/"
                className="mt-1 shrink-0 text-muted hover:text-foreground transition-colors"
              >
                <ArrowLeftIcon width="20" height="20" />
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  Mortgage Calculator
                </h1>
                <p className="text-sm text-muted mt-0.5">
                  Plan your mortgage with Victorian stamp duty and purchase costs
                </p>
              </div>
            </div>

            <HeaderActions
              actions={[
                {
                  key: 'share',
                  label: 'Share',
                  icon: <ShareIcon width="16" height="16" />,
                  onClick: handleShare,
                },
                {
                  key: 'reset',
                  label: 'Reset',
                  icon: <ResetIcon width="16" height="16" />,
                  onClick: handleReset,
                  variant: 'danger',
                },
              ]}
            />
          </div>
        </PageContainer>
      </header>

      {/* Main Content */}
      <main>
        <PageContainer className="py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Inputs */}
            <div className="space-y-6">
              <MortgageForm inputs={inputs} onChange={setInputs} members={members} />
              <PurchaseCostsCard
                costs={purchaseCosts}
                deposit={inputs.deposit}
                propertyPrice={inputs.loanAmount}
              />
              <ExpenseList expenses={expenses} onChange={setExpenses} />
            </div>

            {/* Right Column - Results */}
            <div className="space-y-6">
              <ResultsSummary results={results} splitBreakdown={displaySplitBreakdown} />
              <div className="grid grid-cols-1 gap-6">
                <AmortisationChart data={results?.amortisationSchedule || []} />
                <ExpenseBreakdownChart data={expenseBreakdownData} />
              </div>
            </div>
          </div>
        </PageContainer>
      </main>

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl={shareUrl}
        copied={copied}
        onCopy={handleCopy}
      />
    </>
  )
}

export default function MortgageCalculatorPage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<MortgageLoadingFallback />}>
        <MortgageCalculatorContent />
      </Suspense>
    </div>
  )
}
