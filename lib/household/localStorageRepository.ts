import { HouseholdMember } from '@/types/household'
import { HouseholdRepository } from './repository'

const STORAGE_KEY = 'finance-tools-household'

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
}
