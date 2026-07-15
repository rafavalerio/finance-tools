'use client'

import { Card, CardHeader, CardTitle, CardContent, WarningIcon, ReceiptIcon } from '@/components/ui'
import { PurchaseCosts } from '@/types/mortgage'
import { formatCurrency } from '@/lib/calculations/mortgage'

interface PurchaseCostsCardProps {
  costs: PurchaseCosts | null
  deposit: number
  propertyPrice: number
}

function CostRow({
  label,
  amount,
  highlight = false,
  warning = false,
  indent = false,
}: {
  label: string
  amount: number
  highlight?: boolean
  warning?: boolean
  indent?: boolean
}) {
  return (
    <div
      className={`flex justify-between items-center py-2 ${
        indent ? 'pl-4' : ''
      } ${highlight ? 'font-semibold' : ''}`}
    >
      <span className={`text-sm ${warning ? 'text-amber-400' : 'text-foreground'}`}>{label}</span>
      <span
        className={`text-sm font-medium ${
          warning ? 'text-amber-400' : highlight ? 'text-accent' : 'text-foreground'
        }`}
      >
        {formatCurrency(amount)}
      </span>
    </div>
  )
}

export function PurchaseCostsCard({ costs, deposit, propertyPrice }: PurchaseCostsCardProps) {
  if (!costs || propertyPrice <= 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptIcon width="20" height="20" className="text-accent" />
            Purchase Costs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted">
            <p>Enter property details to see purchase costs.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const depositPercentageOfPrice = (deposit / propertyPrice) * 100

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ReceiptIcon width="20" height="20" className="text-accent" />
          Purchase Costs (Victoria)
        </CardTitle>
        <p className="text-xs text-muted mt-1">{costs.stampDutyDescription}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Deposit breakdown */}
          <div>
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-xs font-medium text-muted uppercase tracking-wide">
                Your Deposit
              </span>
              <span className="text-sm text-muted">
                {depositPercentageOfPrice.toFixed(1)}% of price
              </span>
            </div>
            <div className="mt-2">
              <CostRow label="Total Deposit" amount={deposit} />
            </div>
          </div>

          {/* Upfront costs */}
          <div>
            <div className="pb-2 border-b border-border">
              <span className="text-xs font-medium text-muted uppercase tracking-wide">
                Upfront Costs (Deducted from Deposit)
              </span>
            </div>
            <div className="mt-2 space-y-0.5">
              <CostRow label="Stamp Duty" amount={costs.stampDuty} indent />
              {costs.legalFees > 0 && (
                <CostRow label="Legal/Conveyancing" amount={costs.legalFees} indent />
              )}
              <CostRow label="Title Registration" amount={costs.titleRegistration} indent />
              {costs.buildingInspection > 0 && (
                <CostRow
                  label="Building & Pest Inspection"
                  amount={costs.buildingInspection}
                  indent
                />
              )}
              <CostRow label="Mortgage Registration" amount={costs.mortgageRegistration} indent />
              <div className="pt-2 mt-2 border-t border-border">
                <CostRow label="Total Upfront Costs" amount={costs.totalCosts} highlight />
              </div>
            </div>
          </div>

          {/* Effective deposit */}
          <div className="p-3 rounded-lg bg-background">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-foreground">Effective Deposit</p>
                <p className="text-xs text-muted">After paying upfront costs</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-accent">
                  {formatCurrency(costs.effectiveDeposit)}
                </p>
                <p className="text-xs text-muted">
                  {costs.depositPercentage.toFixed(1)}% of property
                </p>
              </div>
            </div>
          </div>

          {/* LMI Warning */}
          {costs.requiresLMI && (
            <div className="p-3 rounded-lg bg-amber-400/10 border border-amber-400/30">
              <div className="flex gap-2">
                <WarningIcon
                  width="18"
                  height="18"
                  className="text-amber-400 flex-shrink-0 mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-amber-400">
                    Lenders Mortgage Insurance (LMI) Required
                  </p>
                  <p className="text-xs text-amber-400/80 mt-1">
                    With less than 20% effective deposit, most lenders require LMI.
                  </p>
                  <p className="text-sm font-semibold text-amber-400 mt-2">
                    Estimated LMI: {formatCurrency(costs.estimatedLMI)}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    LMI is typically added to the loan amount. Actual cost varies by lender.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Visual breakdown bar */}
          <div className="pt-2">
            <p className="text-xs text-muted mb-2">Deposit Allocation</p>
            <div className="h-4 rounded-full overflow-hidden bg-background flex">
              <div
                className="bg-accent/70 transition-all"
                style={{
                  width: `${Math.min(100, (costs.totalCosts / deposit) * 100)}%`,
                }}
                title={`Upfront Costs: ${formatCurrency(costs.totalCosts)}`}
              />
              <div
                className="bg-accent transition-all"
                style={{
                  width: `${Math.max(0, (costs.effectiveDeposit / deposit) * 100)}%`,
                }}
                title={`Effective Deposit: ${formatCurrency(costs.effectiveDeposit)}`}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-xs text-muted">
              <span>Costs ({((costs.totalCosts / deposit) * 100).toFixed(0)}%)</span>
              <span>Deposit ({((costs.effectiveDeposit / deposit) * 100).toFixed(0)}%)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
