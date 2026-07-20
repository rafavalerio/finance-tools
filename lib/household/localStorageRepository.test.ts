import { describe, it, expect, beforeEach } from 'vitest'
import { LocalStorageHouseholdRepository } from './localStorageRepository'
import { HouseholdMember } from '@/types/household'

const members: HouseholdMember[] = [
  { id: '1', name: 'Rafael', income: 95000 },
  { id: '2', name: 'Partner', income: 80000 },
]

beforeEach(() => {
  localStorage.clear()
})

describe('LocalStorageHouseholdRepository', () => {
  it('returns an empty array when nothing has been saved', async () => {
    const repo = new LocalStorageHouseholdRepository()
    expect(await repo.getMembers()).toEqual([])
  })

  it('round-trips members through localStorage', async () => {
    const repo = new LocalStorageHouseholdRepository()
    await repo.saveMembers(members)
    expect(await repo.getMembers()).toEqual(members)
  })

  it('returns an empty array if the stored value is corrupt', async () => {
    localStorage.setItem('finance-tools-household', 'not-json')
    const repo = new LocalStorageHouseholdRepository()
    expect(await repo.getMembers()).toEqual([])
  })
})
