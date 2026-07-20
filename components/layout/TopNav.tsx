'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { WalletIcon, MoreIcon } from '@/components/ui'

interface NavLink {
  key: string
  label: string
  href: string
  disabled?: boolean
}

const NAV_LINKS: NavLink[] = [
  { key: 'profile', label: 'Profile', href: '/profile' },
  { key: 'mortgage', label: 'Mortgage', href: '/tools/mortgage' },
  { key: 'budget', label: 'Budget', href: '#', disabled: true },
]

export function TopNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const linkClassName = (link: NavLink) => {
    if (link.disabled) return 'text-muted/50 cursor-not-allowed'
    return pathname === link.href
      ? 'text-accent'
      : 'text-muted hover:text-foreground transition-colors'
  }

  return (
    <nav className="border-b border-border">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold text-foreground">
          <WalletIcon width="20" height="20" className="text-accent" />
          Finance Tools
        </Link>

        {/* Inline links from sm: up */}
        <div className="hidden items-center gap-6 text-sm font-medium sm:flex">
          {NAV_LINKS.map((link) =>
            link.disabled ? (
              <span key={link.key} className={linkClassName(link)}>
                {link.label} (soon)
              </span>
            ) : (
              <Link key={link.key} href={link.href} className={linkClassName(link)}>
                {link.label}
              </Link>
            ),
          )}
        </div>

        {/* Collapsed menu below sm: */}
        <div className="relative shrink-0 sm:hidden" ref={menuRef}>
          <button
            onClick={() => setOpen((isOpen) => !isOpen)}
            aria-label="Open navigation menu"
            aria-haspopup="menu"
            aria-expanded={open}
            className="p-2 text-muted transition-colors hover:text-foreground"
          >
            <MoreIcon width="20" height="20" />
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 top-full z-10 mt-2 w-44 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
            >
              {NAV_LINKS.map((link) =>
                link.disabled ? (
                  <span
                    key={link.key}
                    className="block cursor-not-allowed px-4 py-2.5 text-sm text-muted/50"
                  >
                    {link.label} (soon)
                  </span>
                ) : (
                  <Link
                    key={link.key}
                    href={link.href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className={`block px-4 py-2.5 text-sm transition-colors hover:bg-border ${
                      pathname === link.href ? 'text-accent' : 'text-foreground'
                    }`}
                  >
                    {link.label}
                  </Link>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
