import Link from 'next/link'
import { HeaderActions, type HeaderAction, WalletIcon } from '@/components/ui'
import { PageContainer } from './PageContainer'

interface ToolHeaderProps {
  actions: HeaderAction[]
}

export function ToolHeader({ actions }: ToolHeaderProps) {
  return (
    <header className="border-b border-border">
      <PageContainer className="py-3 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="min-w-0 text-lg font-bold text-foreground sm:text-2xl">
            <Link href="/" className="flex items-center gap-2">
              <WalletIcon width="20" height="20" className="shrink-0 text-accent" />
              <span>Mortgage Planner</span>
            </Link>
          </h1>
          <HeaderActions actions={actions} />
        </div>
      </PageContainer>
    </header>
  )
}
