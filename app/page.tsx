import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";

interface ToolCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

function ToolCard({ title, description, href, icon }: ToolCardProps) {
  return (
    <Link href={href} className="block group">
      <Card className="h-full transition-all duration-200 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-accent/10 text-accent group-hover:bg-accent/20 transition-colors">
              {icon}
            </div>
            <CardTitle className="group-hover:text-accent transition-colors">
              {title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold text-foreground">Finance Tools</h1>
          <p className="text-lg text-muted mt-2">
            Personal finance calculators to help you plan and budget
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-6">
            Available Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ToolCard
              title="Mortgage Calculator"
              description="Plan your mortgage repayments, add additional expenses, and see how much you and your partner will each need to contribute monthly."
              href="/tools/mortgage"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              }
            />

            {/* Placeholder for future tools */}
            <Card className="h-full border-dashed opacity-50">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-card text-muted">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" x2="12" y1="8" y2="16" />
                      <line x1="8" x2="16" y1="12" y2="12" />
                    </svg>
                  </div>
                  <CardTitle className="text-muted">More Coming Soon</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted">
                  Savings calculators, interest tools, and more finance utilities
                  will be added here.
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
            Finance Tools — Built with Next.js
          </p>
        </div>
      </footer>
    </div>
  );
}
