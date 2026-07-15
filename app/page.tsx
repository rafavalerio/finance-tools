import Link from 'next/link'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  WalletIcon,
  HouseIcon,
  PlusCircleIcon,
} from '@/components/ui'

interface ToolCardProps {
  title: string
  description: string
  href: string
  icon: React.ReactNode
}

function ToolCard({ title, description, href, icon }: ToolCardProps) {
  return (
    <Link href={href} className="block group">
      <Card
        className={`
          h-full transition-all duration-200
          hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5
        `}
      >
        <CardHeader>
          <div className="flex items-center gap-4">
            <div
              className={`
                p-3 rounded-lg bg-accent/10 text-accent
                group-hover:bg-accent/20 transition-colors
              `}
            >
              {icon}
            </div>
            <CardTitle className="group-hover:text-accent transition-colors">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted">{description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-accent/10 text-accent">
              <WalletIcon width="28" height="28" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-foreground">Finance Tools</h1>
              <p className="text-lg text-muted mt-2">
                Personal finance calculators to help you plan and budget
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-6">Available Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ToolCard
              title="Mortgage Calculator"
              description="Plan your mortgage repayments, add additional expenses, and see how much you and your partner will each need to contribute monthly."
              href="/tools/mortgage"
              icon={<HouseIcon width="24" height="24" />}
            />

            {/* Placeholder for future tools */}
            <Card className="h-full border-dashed opacity-50">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-card text-muted">
                    <PlusCircleIcon width="24" height="24" />
                  </div>
                  <CardTitle className="text-muted">More Coming Soon</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted">
                  Savings calculators, interest tools, and more finance utilities will be added
                  here.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
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
