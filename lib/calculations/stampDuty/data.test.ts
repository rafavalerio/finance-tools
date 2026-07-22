import { describe, it, expect } from 'vitest'
import { STAMP_DUTY_TABLE } from './data'
import { AustralianState } from '@/types/mortgage'

const ALL_STATES: AustralianState[] = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']

describe('STAMP_DUTY_TABLE', () => {
  it('has a config for every Australian state and territory', () => {
    ALL_STATES.forEach((state) => {
      expect(STAMP_DUTY_TABLE[state]).toBeDefined()
    })
  })

  it('gives every state a bracket table that ends in Infinity', () => {
    ALL_STATES.forEach((state) => {
      const brackets = STAMP_DUTY_TABLE[state].brackets
      expect(brackets[brackets.length - 1].upTo).toBe(Infinity)
    })
  })

  it('has no foreign purchaser surcharge for ACT or NT', () => {
    expect(STAMP_DUTY_TABLE.ACT.foreignSurchargeRate).toBe(0)
    expect(STAMP_DUTY_TABLE.NT.foreignSurchargeRate).toBe(0)
  })
})
