import { HouseholdRepository } from './repository'
import { LocalStorageHouseholdRepository } from './localStorageRepository'

export const householdRepository: HouseholdRepository = new LocalStorageHouseholdRepository()
export type { HouseholdRepository }
