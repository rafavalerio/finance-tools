'use client'

import Link from 'next/link'
import { WalletIcon } from '@/components/ui'
import { PageContainer } from './PageContainer'
import { ProfileMenu } from './ProfileMenu'
import { NavMenu } from './NavMenu'

export function TopNav() {
  return (
    <nav className="border-b border-border">
      <PageContainer className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <NavMenu />

          <Link href="/" className="flex shrink-0 items-center gap-2 font-bold text-foreground">
            <WalletIcon width="20" height="20" className="text-accent" />
            Finance Tools
          </Link>
        </div>

        <ProfileMenu />
      </PageContainer>
    </nav>
  )
}
