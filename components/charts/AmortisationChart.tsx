'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent, TrendingDownIcon } from '@/components/ui'
import { AmortisationDataPoint } from '@/types/mortgage'
import { formatCurrency } from '@/lib/calculations/format'
import { CHART_TOOLTIP_STYLE } from './theme'

interface AmortisationChartProps {
  data: AmortisationDataPoint[]
}

export function AmortisationChart({ data }: AmortisationChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDownIcon width="20" height="20" className="text-accent" />
            Loan Balance Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted">
            <p>Enter your loan details to see the amortisation chart.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDownIcon width="20" height="20" className="text-accent" />
          Loan Balance Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="var(--muted)"
                tick={{ fill: 'var(--muted)', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
                interval="preserveStartEnd"
                minTickGap={50}
              />
              <YAxis
                stroke="var(--muted)"
                tick={{ fill: 'var(--muted)', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
                tickFormatter={(value) => formatCurrency(value)}
                width={80}
              />
              <Tooltip
                {...CHART_TOOLTIP_STYLE}
                formatter={(value: number) => [formatCurrency(value), 'Balance']}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="var(--accent)"
                strokeWidth={2}
                fill="url(#balanceGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
