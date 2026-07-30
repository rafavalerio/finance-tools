'use client'

import { Card, CardHeader, CardTitle, CardContent, UsersIcon } from '@/components/ui'
import { MemberBudgetShare } from '@/types/budget'
import { formatCurrencyPrecise } from '@/lib/calculations/format'

interface SplitBreakdownCardProps {
  shares: MemberBudgetShare[]
}

export function SplitBreakdownCard({ shares }: SplitBreakdownCardProps) {
  if (shares.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersIcon width="20" height="20" className="text-accent" />
          Who Pays What
        </CardTitle>
        <p className="text-sm text-muted mt-1">
          Each person&rsquo;s share of the total monthly outgoing, and what is left of their income.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {shares.map((member) => {
            const isShort = member.leftover < 0
            return (
              <div
                key={member.memberId}
                className="p-3 rounded-lg bg-accent/10 border border-accent/30 min-w-0"
              >
                <p className="text-xs text-muted mb-1 truncate">{member.name}</p>
                <p className="text-lg font-bold text-accent truncate">
                  {formatCurrencyPrecise(member.share)}
                </p>
                <p
                  data-testid={`member-leftover-${member.memberId}`}
                  className={`text-xs mt-1 truncate ${isShort ? 'text-red-400' : 'text-muted'}`}
                >
                  {formatCurrencyPrecise(Math.abs(member.leftover))} {isShort ? 'short' : 'left'}
                </p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
