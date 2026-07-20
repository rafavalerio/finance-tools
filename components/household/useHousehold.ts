'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { HouseholdMember } from '@/types/household'
import { householdRepository } from '@/lib/household'

const HOUSEHOLD_UPDATED_EVENT = 'household-updated'

export function useHousehold() {
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const unmountedRef = useRef(false)
  // getMembers() always returns a fresh array reference (JSON.parse), so every load — including
  // one triggered by this instance's own dispatch below — changes `members`' identity. Without
  // this guard the persist effect would re-fire after every load, re-save, and re-dispatch
  // forever. It marks "this members update came from a load, not a local mutation" so the persist
  // effect can skip re-persisting/re-notifying for it exactly once.
  const skipNotifyRef = useRef(false)

  // Load on mount, and again whenever any instance saves a change — so a component that stays
  // mounted across navigations (e.g. the persistent nav's ProfileMenu) picks up edits made
  // elsewhere (e.g. on /profile) in the same session instead of showing stale data until reload.
  useEffect(() => {
    unmountedRef.current = false

    const load = () => {
      householdRepository.getMembers().then((loaded) => {
        if (!unmountedRef.current) {
          skipNotifyRef.current = true
          setMembers(loaded)
          setIsLoaded(true)
        }
      })
    }

    load()
    window.addEventListener(HOUSEHOLD_UPDATED_EVENT, load)
    return () => {
      unmountedRef.current = true
      window.removeEventListener(HOUSEHOLD_UPDATED_EVENT, load)
    }
  }, [])

  // Persist to the repository whenever members change locally, once loaded, and notify other
  // instances — but skip it for updates that came from a load (mount or cross-instance sync),
  // otherwise re-saving the just-loaded data would re-dispatch and loop forever.
  useEffect(() => {
    if (!isLoaded) return
    if (skipNotifyRef.current) {
      skipNotifyRef.current = false
      return
    }
    householdRepository.saveMembers(members)
    window.dispatchEvent(new Event(HOUSEHOLD_UPDATED_EVENT))
  }, [members, isLoaded])

  const addMember = useCallback(() => {
    setMembers((current) => [...current, { id: crypto.randomUUID(), name: '', income: 0 }])
  }, [])

  const updateMember = useCallback((updated: HouseholdMember) => {
    setMembers((current) => current.map((member) => (member.id === updated.id ? updated : member)))
  }, [])

  const removeMember = useCallback((id: string) => {
    setMembers((current) => current.filter((member) => member.id !== id))
  }, [])

  return { members, isLoaded, addMember, updateMember, removeMember }
}
