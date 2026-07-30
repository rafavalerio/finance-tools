'use client'

import { Card, CardHeader, CardTitle, CardContent, ChartBarIcon } from '@/components/ui'
import { BudgetSummary } from '@/types/budget'
import { formatCurrencyPrecise } from '@/lib/calculations/format'

interface BudgetSummaryCardProps {
  summary: BudgetSummary
}

export function BudgetSummaryCard({ summary }: BudgetSummaryCardProps) {
  const isShortfall = summary.surplus < 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartBarIcon width="20" height="20" className="text-accent" />
          Monthly Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="p-3 rounded-lg bg-background min-w-0">
            <p className="text-xs text-muted mb-1">Income</p>
            <p className="text-lg font-bold text-foreground truncate">
              {formatCurrencyPrecise(summary.monthlyIncome)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-background min-w-0">
            <p className="text-xs text-muted mb-1">Expenses</p>
            <p className="text-lg font-bold text-foreground truncate">
              {formatCurrencyPrecise(summary.monthlyExpenses)}
            </p>
          </div>
          <div
            className={`p-3 rounded-lg min-w-0 border ${
              isShortfall ? 'bg-red-400/10 border-red-400/30' : 'bg-accent/10 border-accent/30'
            }`}
          >
            <p className="text-xs text-muted mb-1">{isShortfall ? 'Shortfall' : 'Left over'}</p>
            <p
              data-testid="budget-surplus"
              className={`text-lg font-bold truncate ${isShortfall ? 'text-red-400' : 'text-accent'}`}
            >
              {formatCurrencyPrecise(summary.surplus)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
