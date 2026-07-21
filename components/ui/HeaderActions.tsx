'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import { Button } from './Button'
import { SettingsIcon } from './icons'

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
    <div className="relative shrink-0" ref={menuRef}>
      <Button
        variant="secondary"
        size="sm"
        shape="circle"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <SettingsIcon width="18" height="18" />
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-10 mt-2 w-44 overflow-hidden rounded-lg border border-border bg-card shadow-lg animate-in fade-in zoom-in-95 duration-150"
        >
          {actions.map((action) => (
            <button
              key={action.key}
              role="menuitem"
              onClick={() => {
                action.onClick()
                setOpen(false)
              }}
              className={`flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-border ${
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
  )
}
