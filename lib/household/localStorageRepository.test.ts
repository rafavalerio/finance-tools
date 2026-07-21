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

describe('LocalStorageHouseholdRepository split config', () => {
  it('returns null when no split config has been saved', async () => {
    const repo = new LocalStorageHouseholdRepository()
    expect(await repo.getSplitConfig()).toBeNull()
  })

  it('round-trips a split config through localStorage', async () => {
    const repo = new LocalStorageHouseholdRepository()
    const config = { memberIds: ['1', '2'], mode: 'income' as const }
    await repo.saveSplitConfig(config)
    expect(await repo.getSplitConfig()).toEqual(config)
  })

  it('returns null if the stored split config is corrupt', async () => {
    localStorage.setItem('finance-tools-household-split', 'not-json')
    const repo = new LocalStorageHouseholdRepository()
    expect(await repo.getSplitConfig()).toBeNull()
  })
})
