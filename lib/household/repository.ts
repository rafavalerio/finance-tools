import { HouseholdMember, HouseholdSplitConfig } from '@/types/household'

export interface HouseholdRepository {
  getMembers(): Promise<HouseholdMember[]>
  saveMembers(members: HouseholdMember[]): Promise<void>
  getSplitConfig(): Promise<HouseholdSplitConfig | null>
  saveSplitConfig(config: HouseholdSplitConfig): Promise<void>
}
