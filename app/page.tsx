'use client'

import {
  HouseholdSummaryCard,
  MortgageSnapshotCard,
  BudgetPlaceholderCard,
  useDashboardData,
} from '@/components/dashboard'

export default function HomePage() {
  const { members, mortgageResults } = useDashboardData()

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <HouseholdSummaryCard members={members} />
          <MortgageSnapshotCard results={mortgageResults} />
          <BudgetPlaceholderCard />
        </div>
      </main>

      <footer className="border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
        </div>
      </footer>
    </div>
  )
}
