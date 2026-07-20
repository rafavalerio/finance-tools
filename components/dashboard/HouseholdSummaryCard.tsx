import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, WalletIcon } from '@/components/ui'
import { HouseholdMember } from '@/types/household'
import { formatCompactIncome } from '@/lib/calculations/household'

interface HouseholdSummaryCardProps {
  members: HouseholdMember[]
}

export function HouseholdSummaryCard({ members }: HouseholdSummaryCardProps) {
  if (members.length === 0) {
    return (
      <Link href="/profile" className="block group">
        <Card
          className={`
            h-full border-dashed transition-colors hover:border-accent/50
          `}
        >
          <CardHeader>
            <CardTitle
              className={`
                flex items-center gap-2 text-muted
                group-hover:text-accent transition-colors
              `}
            >
              <WalletIcon width="20" height="20" />
              Household
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted">Set up your household to get started.</p>
          </CardContent>
        </Card>
      </Link>
    )
  }

  const combinedIncome = members.reduce((total, member) => total + member.income, 0)

  return (
    <Link href="/profile" className="block group">
      <Card className="h-full transition-colors hover:border-accent/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 group-hover:text-accent transition-colors">
            <WalletIcon width="20" height="20" className="text-accent" />
            Household
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground font-medium">
            {members.length} member{members.length === 1 ? '' : 's'} ·{' '}
            {formatCompactIncome(combinedIncome)}/yr
          </p>
          <p className="text-sm text-muted mt-1">
            {members.map((member) => member.name).join(', ')}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
