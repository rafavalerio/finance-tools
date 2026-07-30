'use client'

import {
  BudgetLoadingFallback,
  ExpenseList,
  IncomeCard,
  BudgetSummaryCard,
  SplitBreakdownCard,
  useBudgetPlanner,
} from '@/components/tools/budget'
import { ExpenseBreakdownChart } from '@/components/charts'
import { PageContainer, ToolHeader } from '@/components/layout'

export default function BudgetPlannerPage() {
  const {
    expenses,
    setExpenses,
    takeHomeOverride,
    setTakeHomeOverride,
    grossMonthlyIncome,
    mortgageMonthly,
    summary,
    breakdownData,
    memberShares,
    hasMembers,
    isLoaded,
  } = useBudgetPlanner()

  // Expenses, the take-home override and household members all load asynchronously. Without
  // this gate the empty states ("No expenses added yet." etc.) flash on every page load.
  if (!isLoaded) return <BudgetLoadingFallback />

  return (
    <div className="min-h-screen bg-background">
      <ToolHeader title="Budget Planner" actions={[]} />

      <main>
        <PageContainer className="py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Inputs */}
            <div className="space-y-6">
              <IncomeCard
                grossMonthlyIncome={grossMonthlyIncome}
                takeHomeOverride={takeHomeOverride}
                onTakeHomeChange={setTakeHomeOverride}
                hasMembers={hasMembers}
              />
              <ExpenseList
                expenses={expenses}
                onChange={setExpenses}
                mortgageMonthly={mortgageMonthly}
              />
            </div>

            {/* Right Column - Results */}
            <div className="space-y-6">
              <BudgetSummaryCard summary={summary} />
              <SplitBreakdownCard shares={memberShares} />
              <ExpenseBreakdownChart data={breakdownData} />
            </div>
          </div>
        </PageContainer>
      </main>
    </div>
  )
}
