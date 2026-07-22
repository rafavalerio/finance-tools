import { describe, it, expect } from 'vitest'
import { calculateStampDuty } from './engine'

describe('calculateStampDuty', () => {
  describe('standard buyers', () => {
    it('calculates VIC standard duty across tiers (matches pre-existing VIC behaviour)', () => {
      expect(calculateStampDuty('VIC', 500000, 'standard').amount).toBe(
        Math.round(2870 + (500000 - 130000) * 0.06),
      )
    })

    it('calculates NSW standard duty', () => {
      expect(calculateStampDuty('NSW', 500000, 'standard').amount).toBe(
        Math.round(10530 + (500000 - 351000) * 0.045),
      )
    })

    it('calculates QLD standard duty', () => {
      expect(calculateStampDuty('QLD', 500000, 'standard').amount).toBe(
        Math.round(1050 + (500000 - 75000) * 0.035),
      )
    })

    it('calculates WA standard duty', () => {
      expect(calculateStampDuty('WA', 500000, 'standard').amount).toBe(
        Math.round(11115 + (500000 - 360000) * 0.0475),
      )
    })

    it('calculates SA standard duty', () => {
      expect(calculateStampDuty('SA', 500000, 'standard').amount).toBe(
        Math.round(11330 + (500000 - 300000) * 0.05),
      )
    })

    it('calculates TAS standard duty', () => {
      expect(calculateStampDuty('TAS', 500000, 'standard').amount).toBe(
        Math.round(12935 + (500000 - 375000) * 0.0425),
      )
    })

    it('calculates ACT standard duty', () => {
      expect(calculateStampDuty('ACT', 500000, 'standard').amount).toBe(
        Math.round(4000 + (500000 - 300000) * 0.034),
      )
    })

    it('calculates NT standard duty', () => {
      expect(calculateStampDuty('NT', 500000, 'standard').amount).toBe(
        Math.round(9000 + (500000 - 300000) * 0.045),
      )
    })
  })

  describe('first home buyers', () => {
    it('fully exempts VIC FHBs at or under $600,000', () => {
      const { amount, description } = calculateStampDuty('VIC', 600000, 'first_home_buyer')
      expect(amount).toBe(0)
      expect(description).toMatch(/exemption/i)
    })

    it('applies a sliding concession for VIC FHBs between $600k and $750k', () => {
      const { amount, description } = calculateStampDuty('VIC', 675000, 'first_home_buyer')
      expect(amount).toBeGreaterThan(0)
      expect(amount).toBeLessThan(calculateStampDuty('VIC', 675000, 'standard').amount)
      expect(description).toMatch(/concession/i)
    })

    it('falls back to standard duty for VIC FHBs above $750,000', () => {
      const firstHome = calculateStampDuty('VIC', 800000, 'first_home_buyer')
      const standard = calculateStampDuty('VIC', 800000, 'standard')
      expect(firstHome.amount).toBe(standard.amount)
    })

    it('fully exempts NSW FHBs at or under $800,000', () => {
      expect(calculateStampDuty('NSW', 800000, 'first_home_buyer').amount).toBe(0)
    })

    it('applies a sliding concession for NSW FHBs between $800k and $1,000,000', () => {
      const { amount } = calculateStampDuty('NSW', 900000, 'first_home_buyer')
      expect(amount).toBeGreaterThan(0)
      expect(amount).toBeLessThan(calculateStampDuty('NSW', 900000, 'standard').amount)
    })

    it('fully exempts QLD FHBs at or under $500,000 with no concession band above it', () => {
      expect(calculateStampDuty('QLD', 500000, 'first_home_buyer').amount).toBe(0)
      const firstHome = calculateStampDuty('QLD', 550000, 'first_home_buyer')
      const standard = calculateStampDuty('QLD', 550000, 'standard')
      expect(firstHome.amount).toBe(standard.amount)
    })

    it('gives SA and NT FHBs no exemption on established homes', () => {
      expect(calculateStampDuty('SA', 400000, 'first_home_buyer').amount).toBe(
        calculateStampDuty('SA', 400000, 'standard').amount,
      )
      expect(calculateStampDuty('NT', 400000, 'first_home_buyer').amount).toBe(
        calculateStampDuty('NT', 400000, 'standard').amount,
      )
    })
  })

  describe('foreign buyers', () => {
    it('adds an 8% surcharge for VIC foreign buyers', () => {
      const standard = calculateStampDuty('VIC', 800000, 'standard')
      const foreign = calculateStampDuty('VIC', 800000, 'foreign_buyer')
      expect(foreign.amount).toBe(Math.round(standard.amount + 800000 * 0.08))
    })

    it('applies no surcharge for ACT foreign buyers', () => {
      const standard = calculateStampDuty('ACT', 800000, 'standard')
      const foreign = calculateStampDuty('ACT', 800000, 'foreign_buyer')
      expect(foreign.amount).toBe(standard.amount)
    })

    it('applies no surcharge for NT foreign buyers', () => {
      const standard = calculateStampDuty('NT', 400000, 'standard')
      const foreign = calculateStampDuty('NT', 400000, 'foreign_buyer')
      expect(foreign.amount).toBe(standard.amount)
    })
  })
})
