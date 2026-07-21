export interface HouseholdMember {
  id: string
  name: string
  income: number
}

export type SplitMode = 'even' | 'income'

export interface HouseholdSplitConfig {
  memberIds: string[]
  mode: SplitMode
}
