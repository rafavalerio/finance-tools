import { AustralianState, BuyerType } from '@/types/mortgage'
import { DutyBracket } from './types'
import { STAMP_DUTY_TABLE } from './data'

function calculateBracketDuty(brackets: DutyBracket[], propertyPrice: number): number {
  let previousUpTo = 0
  for (const bracket of brackets) {
    if (propertyPrice <= bracket.upTo) {
      return Math.round(bracket.base + (propertyPrice - previousUpTo) * bracket.rate)
    }
    previousUpTo = bracket.upTo
  }
  // Unreachable: the last bracket's upTo is always Infinity
  return 0
}

/**
 * Calculate stamp duty (transfer/conveyance duty) for a given state, property price, and
 * buyer type. First-home-buyer and foreign-buyer treatment is state-specific — see
 * lib/calculations/stampDuty/data.ts for each state's thresholds and rates.
 */
export function calculateStampDuty(
  state: AustralianState,
  propertyPrice: number,
  buyerType: BuyerType,
): { amount: number; description: string } {
  const config = STAMP_DUTY_TABLE[state]
  const standardDuty = calculateBracketDuty(config.brackets, propertyPrice)

  if (buyerType === 'first_home_buyer') {
    if (propertyPrice <= config.fhbFullExemptionUpTo) {
      return {
        amount: 0,
        description: `First Home Buyer - Full exemption (property ≤ $${config.fhbFullExemptionUpTo.toLocaleString()})`,
      }
    }

    if (config.fhbConcessionUpTo !== undefined && propertyPrice <= config.fhbConcessionUpTo) {
      const concessionRate =
        (config.fhbConcessionUpTo - propertyPrice) /
        (config.fhbConcessionUpTo - config.fhbFullExemptionUpTo)
      const concession = standardDuty * concessionRate
      return {
        amount: Math.round(standardDuty - concession),
        description: 'First Home Buyer - Partial concession',
      }
    }
  }

  if (buyerType === 'foreign_buyer') {
    const foreignSurcharge = propertyPrice * config.foreignSurchargeRate
    return {
      amount: Math.round(standardDuty + foreignSurcharge),
      description:
        config.foreignSurchargeRate > 0
          ? `Includes ${Math.round(config.foreignSurchargeRate * 100)}% foreign buyer surcharge`
          : `Standard ${state} stamp duty (no foreign purchaser surcharge in ${state})`,
    }
  }

  return {
    amount: standardDuty,
    description: `Standard ${state} stamp duty`,
  }
}
