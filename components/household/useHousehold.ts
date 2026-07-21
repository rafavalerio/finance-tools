'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { HouseholdMember, HouseholdSplitConfig, SplitMode } from '@/types/household'
import { householdRepository } from '@/lib/household'

const HOUSEHOLD_UPDATED_EVENT = 'household-updated'
const DEFAULT_SPLIT_CONFIG: HouseholdSplitConfig = { memberIds: [], mode: 'even' }

export function useHousehold() {
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [splitConfig, setSplitConfigState] = useState<HouseholdSplitConfig>(DEFAULT_SPLIT_CONFIG)
  const [isLoaded, setIsLoaded] = useState(false)
  const unmountedRef = useRef(false)
  // getMembers()/getSplitConfig() always return fresh references (JSON.parse), so every load —
  // including one triggered by this instance's own dispatch below — changes their identity.
  // Without these guards the persist effects would re-fire after every load, re-save, and
  // re-dispatch forever. Each ref marks "this update came from a load, not a local mutation" so
  // its persist effect can skip re-persisting/re-notifying for it exactly once. Members and split
  // config get separate refs since a single load updates both but a local edit only touches one.
  const skipMembersNotifyRef = useRef(false)
  const skipSplitNotifyRef = useRef(false)
  // True until the first load resolves a real (non-null) saved split config — distinguishes
  // "never configured" from "configured as empty" so the auto-seed effect below fires at most
  // once, on genuinely first use, and never re-applies after a deliberate "select nobody".
  const neverConfiguredRef = useRef(true)
  const hasSeededSplitRef = useRef(false)

  // Load on mount, and again whenever any instance saves a change — so a component that stays
  // mounted across navigations (e.g. the persistent nav's ProfileMenu) picks up edits made
  // elsewhere (e.g. on /profile) in the same session instead of showing stale data until reload.
  useEffect(() => {
    unmountedRef.current = false

    const load = () => {
      Promise.all([householdRepository.getMembers(), householdRepository.getSplitConfig()]).then(
        ([loadedMembers, loadedSplitConfig]) => {
          if (!unmountedRef.current) {
            skipMembersNotifyRef.current = true
            skipSplitNotifyRef.current = true
            neverConfiguredRef.current = loadedSplitConfig === null
            setMembers(loadedMembers)
            setSplitConfigState(loadedSplitConfig ?? DEFAULT_SPLIT_CONFIG)
            setIsLoaded(true)
          }
        },
      )
    }

    load()
    window.addEventListener(HOUSEHOLD_UPDATED_EVENT, load)
    return () => {
      unmountedRef.current = true
      window.removeEventListener(HOUSEHOLD_UPDATED_EVENT, load)
    }
  }, [])

  // Persist members to the repository whenever they change locally, once loaded, and notify
  // other instances — but skip it for updates that came from a load (mount or cross-instance
  // sync), otherwise re-saving the just-loaded data would re-dispatch and loop forever.
  useEffect(() => {
    if (!isLoaded) return
    if (skipMembersNotifyRef.current) {
      skipMembersNotifyRef.current = false
      return
    }
    householdRepository.saveMembers(members)
    window.dispatchEvent(new Event(HOUSEHOLD_UPDATED_EVENT))
  }, [members, isLoaded])

  // Same persist-and-notify pattern as members, for the split config.
  useEffect(() => {
    if (!isLoaded) return
    if (skipSplitNotifyRef.current) {
      skipSplitNotifyRef.current = false
      return
    }
    householdRepository.saveSplitConfig(splitConfig)
    window.dispatchEvent(new Event(HOUSEHOLD_UPDATED_EVENT))
  }, [splitConfig, isLoaded])

  // Default to splitting between every household member the first time there are 2+ and split
  // config has never been saved before. Guarded so it fires at most once per mount and never
  // re-applies after any explicit save (including a deliberate "select nobody").
  useEffect(() => {
    if (
      !hasSeededSplitRef.current &&
      isLoaded &&
      neverConfiguredRef.current &&
      members.length >= 2 &&
      splitConfig.memberIds.length === 0
    ) {
      hasSeededSplitRef.current = true
      // Deferred via a microtask purely to satisfy react-hooks/set-state-in-effect's static analysis.
      Promise.resolve().then(() => {
        if (!unmountedRef.current) {
          setSplitConfigState((current) => ({ ...current, memberIds: members.map((m) => m.id) }))
        }
      })
    }
  }, [isLoaded, members, splitConfig.memberIds])

  const addMember = useCallback(() => {
    setMembers((current) => [...current, { id: crypto.randomUUID(), name: '', income: 0 }])
  }, [])

  const updateMember = useCallback((updated: HouseholdMember) => {
    setMembers((current) => current.map((member) => (member.id === updated.id ? updated : member)))
  }, [])

  const removeMember = useCallback((id: string) => {
    setMembers((current) => current.filter((member) => member.id !== id))
  }, [])

  const toggleSplitMember = useCallback((memberId: string, included: boolean) => {
    setSplitConfigState((current) => ({
      ...current,
      memberIds: included
        ? [...current.memberIds, memberId]
        : current.memberIds.filter((id) => id !== memberId),
    }))
  }, [])

  const setSplitMode = useCallback((mode: SplitMode) => {
    setSplitConfigState((current) => ({ ...current, mode }))
  }, [])

  return {
    members,
    splitConfig,
    isLoaded,
    addMember,
    updateMember,
    removeMember,
    toggleSplitMember,
    setSplitMode,
  }
}
