'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CloseIcon } from '@/components/ui'

interface NavLink {
  key: string
  label: string
  href: string
  disabled?: boolean
}

const NAV_LINKS: NavLink[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/' },
  { key: 'mortgage', label: 'Mortgage', href: '/tools/mortgage' },
  { key: 'budget', label: 'Budget', href: '#', disabled: true },
]

interface NavDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function NavDrawer({ isOpen, onClose }: NavDrawerProps) {
  const pathname = usePathname()

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const linkClassName = (link: NavLink) => {
    if (link.disabled) return 'text-muted/50 cursor-not-allowed'
    return pathname === link.href
      ? 'text-accent'
      : 'text-foreground hover:text-accent transition-colors'
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className="relative h-full w-64 max-w-[80vw] bg-card border-r border-border shadow-2xl animate-in slide-in-from-left duration-200"
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <span className="font-bold text-foreground">Finance Tools</span>
          <button
            onClick={onClose}
            aria-label="Close navigation menu"
            className="text-muted hover:text-foreground transition-colors"
          >
            <CloseIcon width="20" height="20" />
          </button>
        </div>

        <nav className="py-2">
          {NAV_LINKS.map((link) =>
            link.disabled ? (
              <span
                key={link.key}
                className={`block px-4 py-3 text-sm font-medium ${linkClassName(link)}`}
              >
                {link.label} (soon)
              </span>
            ) : (
              <Link
                key={link.key}
                href={link.href}
                onClick={onClose}
                className={`block px-4 py-3 text-sm font-medium ${linkClassName(link)}`}
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>
      </div>
    </div>
  )
}
