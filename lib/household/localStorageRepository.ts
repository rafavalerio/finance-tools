import { HouseholdMember, HouseholdSplitConfig } from '@/types/household'
import { HouseholdRepository } from './repository'

const STORAGE_KEY = 'finance-tools-household'
const SPLIT_STORAGE_KEY = 'finance-tools-household-split'

export class LocalStorageHouseholdRepository implements HouseholdRepository {
  async getMembers(): Promise<HouseholdMember[]> {
    try {
      const json = localStorage.getItem(STORAGE_KEY)
      return json ? JSON.parse(json) : []
    } catch (error) {
      console.error('Failed to load household from localStorage:', error)
      return []
    }
  }

  async saveMembers(members: HouseholdMember[]): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(members))
    } catch (error) {
      console.error('Failed to save household to localStorage:', error)
    }
  }

  async getSplitConfig(): Promise<HouseholdSplitConfig | null> {
    try {
      const json = localStorage.getItem(SPLIT_STORAGE_KEY)
      return json ? JSON.parse(json) : null
    } catch (error) {
      console.error('Failed to load split config from localStorage:', error)
      return null
    }
  }

  async saveSplitConfig(config: HouseholdSplitConfig): Promise<void> {
    try {
      localStorage.setItem(SPLIT_STORAGE_KEY, JSON.stringify(config))
    } catch (error) {
      console.error('Failed to save split config to localStorage:', error)
    }
  }
}
