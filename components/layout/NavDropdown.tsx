'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_LINKS, type NavLink } from './navLinks'

interface NavDropdownProps {
  isOpen: boolean
  onClose: () => void
}

export function NavDropdown({ isOpen, onClose }: NavDropdownProps) {
  const pathname = usePathname()

  if (!isOpen) return null

  const linkClassName = (link: NavLink) => {
    if (link.disabled) return 'text-muted/50 cursor-not-allowed'
    return pathname === link.href
      ? 'text-accent'
      : 'text-foreground hover:text-accent transition-colors'
  }

  return (
    <div
      role="menu"
      className="absolute left-0 top-full z-10 mt-2 w-48 overflow-hidden rounded-lg border border-border bg-card shadow-lg animate-in fade-in zoom-in-95 duration-150"
    >
      {NAV_LINKS.map((link) =>
        link.disabled ? (
          <span
            key={link.key}
            className={`block px-4 py-2.5 text-sm font-medium ${linkClassName(link)}`}
          >
            {link.label} (soon)
          </span>
        ) : (
          <Link
            key={link.key}
            href={link.href}
            onClick={onClose}
            className={`block px-4 py-2.5 text-sm font-medium transition-colors hover:bg-border ${linkClassName(link)}`}
          >
            {link.label}
          </Link>
        ),
      )}
    </div>
  )
}
