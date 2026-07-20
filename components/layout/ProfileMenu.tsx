'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Button, UserIcon } from '@/components/ui'
import { useHousehold } from '@/components/household'
import { formatCompactIncome } from '@/lib/calculations/household'

export function ProfileMenu() {
  const { members } = useHousehold()
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

  const combinedIncome = members.reduce((total, member) => total + member.income, 0)

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-label="Open profile menu"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <UserIcon width="20" height="20" />
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-10 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
        >
          {members.length === 0 ? (
            <div className="px-4 py-3">
              <p className="text-sm text-muted mb-2">Set up your household to get started.</p>
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="text-sm text-accent hover:underline"
              >
                Manage household →
              </Link>
            </div>
          ) : (
            <div className="px-4 py-3">
              <p className="text-sm font-medium text-foreground">
                {members.length} member{members.length === 1 ? '' : 's'} ·{' '}
                {formatCompactIncome(combinedIncome)}/yr
              </p>
              <p className="text-sm text-muted mt-1">
                {members.map((member) => member.name).join(', ')}
              </p>
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="mt-3 block text-sm text-accent hover:underline"
              >
                Manage household →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
