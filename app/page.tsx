'use client'

import { MortgageSnapshotCard, BudgetSnapshotCard, useDashboardData } from '@/components/dashboard'
import { PageContainer } from '@/components/layout'

export default function HomePage() {
  const { mortgageResults, budgetSummary, topCategories } = useDashboardData()

  return (
    <div className="min-h-screen bg-background">
      <main>
        <PageContainer className="py-12">
          <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MortgageSnapshotCard results={mortgageResults} />
            <BudgetSnapshotCard summary={budgetSummary} topCategories={topCategories} />
          </div>
        </PageContainer>
      </main>

      <footer className="border-t border-border mt-auto">
        <PageContainer className="py-6">
          <p className="text-sm text-muted text-center">
            Built by{' '}
            <a
              href="https://rafavalerio.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-accent transition-colors"
            >
              Rafael Valerio
            </a>
          </p>
        </PageContainer>
      </footer>
    </div>
  )
}
