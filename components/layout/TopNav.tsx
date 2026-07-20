'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button, WalletIcon, MenuIcon } from '@/components/ui'
import { PageContainer } from './PageContainer'
import { ProfileMenu } from './ProfileMenu'
import { NavDrawer } from './NavDrawer'

export function TopNav() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <nav className="border-b border-border">
      <PageContainer className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            shape="circle"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={drawerOpen}
          >
            <MenuIcon width="20" height="20" />
          </Button>

          <Link href="/" className="flex shrink-0 items-center gap-2 font-bold text-foreground">
            <WalletIcon width="20" height="20" className="text-accent" />
            Finance Tools
          </Link>
        </div>

        <ProfileMenu />
      </PageContainer>

      <NavDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </nav>
  )
}
