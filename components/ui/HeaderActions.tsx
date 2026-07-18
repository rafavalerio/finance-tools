'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import { Button } from './Button'
import { MoreIcon } from './icons'

export interface HeaderAction {
  key: string
  label: string
  icon: ReactNode
  onClick: () => void
  /** 'danger' mutes the control until hovered/focused, then tints it red (e.g. "Reset"). */
  variant?: 'default' | 'danger'
}

interface HeaderActionsProps {
  actions: HeaderAction[]
}

export function HeaderActions({ actions }: HeaderActionsProps) {
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

  return (
    <>
      {/* Inline buttons from sm: up */}
      <div className="hidden items-center gap-2 sm:flex">
        {actions.map((action) => (
          <Button
            key={action.key}
            variant={action.variant === 'danger' ? 'ghost' : 'secondary'}
            size="sm"
            onClick={action.onClick}
            className={action.variant === 'danger' ? 'text-muted hover:text-red-400' : ''}
          >
            <span className="mr-2">{action.icon}</span>
            {action.label}
          </Button>
        ))}
      </div>

      {/* Collapsed menu below sm: */}
      <div className="relative shrink-0 sm:hidden" ref={menuRef}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setOpen((isOpen) => !isOpen)}
          aria-label="More actions"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <MoreIcon width="16" height="16" />
        </Button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-full z-10 mt-2 w-44 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
          >
            {actions.map((action) => (
              <button
                key={action.key}
                role="menuitem"
                onClick={() => {
                  action.onClick()
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-border ${
                  action.variant === 'danger' ? 'text-muted hover:text-red-400' : 'text-foreground'
                }`}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
