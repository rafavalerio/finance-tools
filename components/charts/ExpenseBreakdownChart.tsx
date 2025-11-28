'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { ExpenseBreakdownItem } from '@/types/mortgage'
import { formatCurrencyPrecise } from '@/lib/calculations/mortgage'

interface ChartDataItem {
  name: string
  value: number
  color: string
  [key: string]: string | number
}

interface ExpenseBreakdownChartProps {
  data: ExpenseBreakdownItem[]
}

const COLORS = [
  'rgb(217, 119, 87)', // accent
  'rgb(139, 195, 156)', // green
  'rgb(147, 178, 212)', // blue
  'rgb(219, 182, 136)', // gold
  'rgb(198, 146, 184)', // purple
  'rgb(168, 198, 184)', // teal
  'rgb(212, 163, 156)', // coral
  'rgb(176, 176, 168)', // gray
]

export function ExpenseBreakdownChart({ data }: ExpenseBreakdownChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Expense Breakdown</CardTitle>
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
        <CardTitle>Monthly Expense Breakdown</CardTitle>
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
                contentStyle={{
                  backgroundColor: 'rgb(48, 48, 46)',
                  border: '1px solid rgb(68, 68, 64)',
                  borderRadius: '8px',
                  color: 'rgb(194, 192, 182)',
                }}
                labelStyle={{ color: 'rgb(194, 192, 182)', fontWeight: 'bold' }}
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
