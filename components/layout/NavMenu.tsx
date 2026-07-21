'use client'

import { useEffect, useRef, useState } from 'react'
import { Button, MenuIcon } from '@/components/ui'
import { NavDropdown } from './NavDropdown'
import { NavDrawer } from './NavDrawer'

// Matches Tailwind's `md` breakpoint — below it we use the full-screen NavDrawer, at/above it
// we use the small anchored NavDropdown instead.
const DESKTOP_QUERY = '(min-width: 768px)'

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mediaQueryList = window.matchMedia(DESKTOP_QUERY)
    const handleChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mediaQueryList.addEventListener('change', handleChange)

    // Deferred via a microtask purely to satisfy react-hooks/set-state-in-effect's static
    // analysis (it only flags setState calls made directly/synchronously in the effect body).
    Promise.resolve().then(() => setIsDesktop(mediaQueryList.matches))

    return () => mediaQueryList.removeEventListener('change', handleChange)
  }, [])

  return isDesktop
}

export function NavMenu() {
  const [open, setOpen] = useState(false)
  const isDesktop = useIsDesktop()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    // NavDrawer also closes itself on Escape; this is a harmless double-call in that case and
    // the only way NavDropdown (which has no listeners of its own) closes on Escape.
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
    <div className="relative" ref={containerRef}>
      <Button
        variant="ghost"
        size="sm"
        shape="circle"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-label="Open navigation menu"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MenuIcon width="20" height="20" />
      </Button>

      {isDesktop ? (
        <NavDropdown isOpen={open} onClose={() => setOpen(false)} />
      ) : (
        <NavDrawer isOpen={open} onClose={() => setOpen(false)} />
      )}
    </div>
  )
}
