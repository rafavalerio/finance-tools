import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, HouseIcon } from '@/components/ui'
import { MortgageResults } from '@/types/mortgage'
import { formatCurrencyPrecise } from '@/lib/calculations/mortgage'

interface MortgageSnapshotCardProps {
  results: MortgageResults | null
}

export function MortgageSnapshotCard({ results }: MortgageSnapshotCardProps) {
  if (!results) {
    return (
      <Link href="/tools/mortgage" className="block group">
        <Card className="h-full border-dashed transition-colors hover:border-accent/50">
          <CardHeader>
            <CardTitle
              className={`
                flex items-center gap-2 text-muted
                group-hover:text-accent transition-colors
              `}
            >
              <HouseIcon width="20" height="20" />
              Mortgage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted">Get started with the mortgage calculator.</p>
          </CardContent>
        </Card>
      </Link>
    )
  }

  return (
    <Link href="/tools/mortgage" className="block group">
      <Card className="h-full transition-colors hover:border-accent/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 group-hover:text-accent transition-colors">
            <HouseIcon width="20" height="20" className="text-accent" />
            Mortgage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground font-medium">
            {formatCurrencyPrecise(results.monthlyMortgagePayment)}/mo
          </p>
          <p className="text-sm text-muted mt-1">
            Payoff {results.payoffDate.toLocaleDateString('en-AU', { year: 'numeric' })}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
