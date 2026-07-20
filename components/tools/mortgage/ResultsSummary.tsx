'use client'

import { Card, CardHeader, CardTitle, CardContent, ChartBarIcon } from '@/components/ui'
import { MortgageResults, SplitSnapshotEntry } from '@/types/mortgage'
import {
  formatCurrency,
  formatCurrencyPrecise,
  formatFrequencyLabel,
} from '@/lib/calculations/mortgage'

interface ResultsSummaryProps {
  results: MortgageResults | null
  splitBreakdown: SplitSnapshotEntry[]
}

function StatCard({
  label,
  value,
  subtext,
  highlight = false,
}: {
  label: string
  value: string
  subtext?: string
  highlight?: boolean
}) {
  return (
    <div
      className={`p-3 rounded-lg min-w-0 overflow-hidden ${
        highlight ? 'bg-accent/10 border border-accent/30' : 'bg-background'
      }`}
    >
      <p className="text-xs text-muted mb-1 whitespace-nowrap truncate">{label}</p>
      <p className={`text-lg font-bold truncate ${highlight ? 'text-accent' : 'text-foreground'}`}>
        {value}
      </p>
      {subtext && <p className="text-xs text-muted mt-1 whitespace-nowrap">{subtext}</p>}
    </div>
  )
}

export function ResultsSummary({ results, splitBreakdown }: ResultsSummaryProps) {
  if (!results) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartBarIcon width="20" height="20" className="text-accent" />
            Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted">
            <p>Enter your loan details to see the results.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartBarIcon width="20" height="20" className="text-accent" />
          Results Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Repayment Details */}
          <div>
            <h4 className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
              Mortgage Repayments
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <StatCard label="Loan Amount" value={formatCurrency(results.principalAmount)} />
              <StatCard
                label={`Repayment ${formatFrequencyLabel(results.repaymentFrequency)}`}
                value={formatCurrencyPrecise(results.repaymentAmount)}
              />
              <StatCard
                label="Monthly Equivalent"
                value={formatCurrencyPrecise(results.monthlyMortgagePayment)}
              />
            </div>
          </div>

          {/* Total Monthly Outgoings */}
          <div>
            <h4 className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
              Monthly Outgoings
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <StatCard
                label="Mortgage"
                value={formatCurrencyPrecise(results.monthlyMortgagePayment)}
              />
              <StatCard
                label="Other Expenses"
                value={formatCurrencyPrecise(results.monthlyExpensesTotal)}
              />
              <StatCard
                label="Total Monthly"
                value={formatCurrencyPrecise(results.totalMonthlyOutgoing)}
                highlight
              />
            </div>
          </div>

          {/* Cost split, only shown once there's a breakdown to show */}
          {splitBreakdown.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Split</h4>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {splitBreakdown.map((entry) => (
                  <StatCard
                    key={entry.name}
                    label={entry.name}
                    value={formatCurrencyPrecise(entry.amount)}
                    subtext="per month"
                    highlight
                  />
                ))}
              </div>
            </div>
          )}

          {/* Loan Summary */}
          <div>
            <h4 className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
              Loan Overview
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <StatCard label="Total Repayments" value={formatCurrency(results.totalRepayments)} />
              <StatCard label="Total Interest" value={formatCurrency(results.totalInterest)} />
              <StatCard
                label="Payoff Date"
                value={results.payoffDate.toLocaleDateString('en-AU', {
                  month: 'long',
                  year: 'numeric',
                })}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
