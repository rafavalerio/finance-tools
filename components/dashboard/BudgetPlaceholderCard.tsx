import { Card, CardHeader, CardTitle, CardContent, PlusCircleIcon } from '@/components/ui'

export function BudgetPlaceholderCard() {
  return (
    <Card className="h-full border-dashed opacity-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-muted">
          <PlusCircleIcon width="20" height="20" />
          Budget Planner
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted">Coming soon.</p>
      </CardContent>
    </Card>
  )
}
