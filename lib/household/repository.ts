import { HouseholdMember } from '@/types/household'

export interface HouseholdRepository {
  getMembers(): Promise<HouseholdMember[]>
  saveMembers(members: HouseholdMember[]): Promise<void>
}
