import Link from 'next/link'
import { HeaderActions, type HeaderAction, WalletIcon } from '@/components/ui'
import { PageContainer } from './PageContainer'

interface ToolHeaderProps {
  title: string
  actions: HeaderAction[]
}

export function ToolHeader({ title, actions }: ToolHeaderProps) {
  return (
    <header className="border-b border-border">
      <PageContainer className="py-3 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-3">
            <Link
              href="/"
              aria-label="Mortgage Planner home"
              className="flex shrink-0 items-center gap-2 font-bold text-foreground"
            >
              <WalletIcon width="20" height="20" className="text-accent" />
              <span>Mortgage Planner</span>
            </Link>
            <span aria-hidden="true" className="hidden h-6 border-l border-border sm:block" />
            <h1 className="truncate text-lg font-bold text-foreground sm:text-2xl">{title}</h1>
          </div>
          <HeaderActions actions={actions} />
        </div>
      </PageContainer>
    </header>
  )
}
