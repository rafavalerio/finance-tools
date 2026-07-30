import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, ReceiptIcon } from '@/components/ui'
import { BudgetSummary, ExpenseBreakdownItem } from '@/types/budget'
import { formatCurrencyPrecise } from '@/lib/calculations/format'

interface BudgetSnapshotCardProps {
  summary: BudgetSummary | null
  topCategories: ExpenseBreakdownItem[]
}

export function BudgetSnapshotCard({ summary, topCategories }: BudgetSnapshotCardProps) {
  if (!summary) {
    return (
      <Link href="/tools/budget" className="block group">
        <Card className="h-full border-dashed transition-colors hover:border-accent/50">
          <CardHeader>
            <CardTitle
              className={`
                flex items-center gap-2 text-muted
                group-hover:text-accent transition-colors
              `}
            >
              <ReceiptIcon width="20" height="20" />
              Budget Planner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted">Get started with the budget planner.</p>
          </CardContent>
        </Card>
      </Link>
    )
  }

  const isShort = summary.surplus < 0

  return (
    <Link href="/tools/budget" className="block group">
      <Card className="h-full transition-colors hover:border-accent/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 group-hover:text-accent transition-colors">
            <ReceiptIcon width="20" height="20" className="text-accent" />
            Budget Planner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`font-medium ${isShort ? 'text-red-400' : 'text-foreground'}`}>
            {formatCurrencyPrecise(Math.abs(summary.surplus))}/mo {isShort ? 'short' : 'left'}
          </p>
          {topCategories.length > 0 && (
            <p className="text-sm text-muted mt-1">
              {topCategories.map((category) => category.name).join(' · ')}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
