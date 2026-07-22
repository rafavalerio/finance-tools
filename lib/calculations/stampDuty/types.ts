export interface DutyBracket {
  upTo: number
  rate: number
  base: number
}

export interface StateDutyConfig {
  brackets: DutyBracket[]
  fhbFullExemptionUpTo: number
  fhbConcessionUpTo?: number
  foreignSurchargeRate: number
  titleRegistrationFee: number
  mortgageRegistrationFee: number
}
