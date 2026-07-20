'use client'

import { useCallback, useEffect, useState } from 'react'
import { HouseholdMember } from '@/types/household'
import { householdRepository } from '@/lib/household'

export function useHousehold() {
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from the repository on mount
  useEffect(() => {
    let cancelled = false
    householdRepository.getMembers().then((loaded) => {
      if (!cancelled) {
        setMembers(loaded)
        setIsLoaded(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Persist to the repository whenever members change, once loaded
  useEffect(() => {
    if (isLoaded) {
      householdRepository.saveMembers(members)
    }
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
