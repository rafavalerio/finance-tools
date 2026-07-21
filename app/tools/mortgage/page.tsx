'use client'

import { Suspense } from 'react'
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
import { ShareIcon, ResetIcon } from '@/components/ui'
import { PageContainer, ToolHeader } from '@/components/layout'

function MortgageCalculatorContent() {
  const {
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
    displaySplitBreakdown,
    expenseBreakdownData,
  } = useMortgageCalculator()

  return (
    <>
      {/* Header */}
      <ToolHeader
        title="Mortgage Calculator"
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

      {/* Main Content */}
      <main>
        <PageContainer className="py-8">
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
