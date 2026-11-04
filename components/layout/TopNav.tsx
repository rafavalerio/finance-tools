'use client'

import Link from 'next/link'
import { WalletIcon } from '@/components/ui'
import { PageContainer } from './PageContainer'

export function TopNav() {
  return (
    <nav className="border-b border-border">
      <PageContainer className="flex h-16 items-center">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold text-foreground">
          <WalletIcon width="20" height="20" className="text-accent" />
          Mortgage Planner
        </Link>
      </PageContainer>
    </nav>
  )
}
