'use client'

import Link from 'next/link'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  WalletIcon,
} from '@/components/ui'
import { formatCurrencyPrecise } from '@/lib/calculations/format'

interface IncomeCardProps {
  grossMonthlyIncome: number
  takeHomeOverride: number | null
  onTakeHomeChange: (value: number | null) => void
  hasMembers: boolean
}

export function IncomeCard({
  grossMonthlyIncome,
  takeHomeOverride,
  onTakeHomeChange,
  hasMembers,
}: IncomeCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WalletIcon width="20" height="20" className="text-accent" />
          Income
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasMembers ? (
          <div className="text-center py-8 text-muted">
            <p>No household members yet.</p>
            <Link href="/profile" className="text-accent hover:underline text-sm mt-1 inline-block">
              Set up your household
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-background">
              <p className="text-xs text-muted mb-1">Gross monthly income</p>
              <p className="text-lg font-bold text-foreground">
                {formatCurrencyPrecise(grossMonthlyIncome)}
              </p>
              <p className="text-xs text-muted mt-1">
                Household income before tax, from your profile.
              </p>
            </div>

            <div className="flex items-end gap-3">
              <Input
                id="budget-take-home"
                label="Monthly take-home"
                type="number"
                prefix="$"
                placeholder="Optional"
                value={takeHomeOverride ?? ''}
                onChange={(e) => {
                  const parsed = parseFloat(e.target.value)
                  onTakeHomeChange(e.target.value === '' || isNaN(parsed) ? null : parsed)
                }}
              />
              {takeHomeOverride !== null && (
                <Button variant="ghost" size="md" onClick={() => onTakeHomeChange(null)}>
                  Use gross
                </Button>
              )}
            </div>
            <p className="text-xs text-muted">
              Set this to budget against what actually lands in your account.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
