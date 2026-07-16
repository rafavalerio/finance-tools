'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent, PieChartIcon } from '@/components/ui'
import { ExpenseBreakdownItem } from '@/types/mortgage'
import { formatCurrencyPrecise } from '@/lib/calculations/mortgage'
import { CHART_ACCENT_COLOR, CHART_PALETTE, CHART_TOOLTIP_STYLE } from './theme'

interface ChartDataItem {
  name: string
  value: number
  color: string
  [key: string]: string | number
}

interface ExpenseBreakdownChartProps {
  data: ExpenseBreakdownItem[]
}

const COLORS = [CHART_ACCENT_COLOR, ...CHART_PALETTE]

export function ExpenseBreakdownChart({ data }: ExpenseBreakdownChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon width="20" height="20" className="text-accent" />
            Monthly Expense Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted">
            <p>Enter your loan details to see the expense breakdown.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Convert to chart-compatible format with index signature
  const chartData: ChartDataItem[] = data.map((item) => ({
    name: item.name,
    value: item.value,
    color: item.color,
  }))

  const total = chartData.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon width="20" height="20" className="text-accent" />
          Monthly Expense Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                {...CHART_TOOLTIP_STYLE}
                itemStyle={{ color: 'rgb(194, 192, 182)' }}
                formatter={(value: number) => [formatCurrencyPrecise(value), 'Monthly']}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => {
                  const item = chartData.find((d) => d.name === value)
                  const percentage = item ? ((item.value / total) * 100).toFixed(1) : 0
                  return (
                    <span style={{ color: 'rgb(194, 192, 182)' }}>
                      {value} ({percentage}%)
                    </span>
                  )
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
