import { AustralianState } from '@/types/mortgage'
import { StateDutyConfig } from './types'

/**
 * Approximate 2025-26 stamp duty schedules per state/territory.
 * Verify against each state revenue office before relying on these for a real purchase —
 * thresholds are typically indexed annually. ACT's top bracket and all of NT's brackets are
 * simplified approximations of formulas that don't fit a flat marginal-bracket shape.
 */
export const STAMP_DUTY_TABLE: Record<AustralianState, StateDutyConfig> = {
  VIC: {
    brackets: [
      { upTo: 25_000, rate: 0.014, base: 0 },
      { upTo: 130_000, rate: 0.024, base: 350 },
      { upTo: 960_000, rate: 0.06, base: 2_870 },
      { upTo: 2_000_000, rate: 0.055, base: 52_670 },
      { upTo: Infinity, rate: 0.065, base: 109_870 },
    ],
    fhbFullExemptionUpTo: 600_000,
    fhbConcessionUpTo: 750_000,
    foreignSurchargeRate: 0.08,
    titleRegistrationFee: 150,
    mortgageRegistrationFee: 120,
  },
  NSW: {
    brackets: [
      { upTo: 16_000, rate: 0.0125, base: 0 },
      { upTo: 35_000, rate: 0.015, base: 200 },
      { upTo: 93_000, rate: 0.0175, base: 485 },
      { upTo: 351_000, rate: 0.035, base: 1_500 },
      { upTo: 1_168_000, rate: 0.045, base: 10_530 },
      { upTo: Infinity, rate: 0.055, base: 47_295 },
    ],
    fhbFullExemptionUpTo: 800_000,
    fhbConcessionUpTo: 1_000_000,
    foreignSurchargeRate: 0.09,
    titleRegistrationFee: 154,
    mortgageRegistrationFee: 154,
  },
  QLD: {
    brackets: [
      { upTo: 5_000, rate: 0, base: 0 },
      { upTo: 75_000, rate: 0.015, base: 0 },
      { upTo: 540_000, rate: 0.035, base: 1_050 },
      { upTo: 1_000_000, rate: 0.045, base: 17_325 },
      { upTo: Infinity, rate: 0.0575, base: 38_025 },
    ],
    fhbFullExemptionUpTo: 500_000,
    foreignSurchargeRate: 0.08,
    titleRegistrationFee: 195,
    mortgageRegistrationFee: 195,
  },
  WA: {
    brackets: [
      { upTo: 120_000, rate: 0.019, base: 0 },
      { upTo: 150_000, rate: 0.0285, base: 2_280 },
      { upTo: 360_000, rate: 0.038, base: 3_135 },
      { upTo: 725_000, rate: 0.0475, base: 11_115 },
      { upTo: Infinity, rate: 0.0515, base: 28_453 },
    ],
    fhbFullExemptionUpTo: 500_000,
    fhbConcessionUpTo: 700_000,
    foreignSurchargeRate: 0.07,
    titleRegistrationFee: 195,
    mortgageRegistrationFee: 195,
  },
  SA: {
    brackets: [
      { upTo: 12_000, rate: 0.01, base: 0 },
      { upTo: 30_000, rate: 0.02, base: 120 },
      { upTo: 50_000, rate: 0.03, base: 480 },
      { upTo: 100_000, rate: 0.035, base: 1_080 },
      { upTo: 200_000, rate: 0.04, base: 2_830 },
      { upTo: 250_000, rate: 0.0425, base: 6_830 },
      { upTo: 300_000, rate: 0.0475, base: 8_955 },
      { upTo: 500_000, rate: 0.05, base: 11_330 },
      { upTo: Infinity, rate: 0.055, base: 21_330 },
    ],
    // SA's FHB stamp duty relief applies only to new-home builds (out of scope, see design doc);
    // established-home purchases get no FHB duty concession under current settings.
    fhbFullExemptionUpTo: 0,
    foreignSurchargeRate: 0.07,
    titleRegistrationFee: 180,
    mortgageRegistrationFee: 180,
  },
  TAS: {
    brackets: [
      { upTo: 3_000, rate: 0.0167, base: 0 },
      { upTo: 25_000, rate: 0.0175, base: 50 },
      { upTo: 75_000, rate: 0.0225, base: 435 },
      { upTo: 200_000, rate: 0.035, base: 1_560 },
      { upTo: 375_000, rate: 0.04, base: 5_935 },
      { upTo: 725_000, rate: 0.0425, base: 12_935 },
      { upTo: Infinity, rate: 0.045, base: 27_810 },
    ],
    fhbFullExemptionUpTo: 750_000,
    foreignSurchargeRate: 0.08,
    titleRegistrationFee: 152,
    mortgageRegistrationFee: 152,
  },
  ACT: {
    brackets: [
      { upTo: 260_000, rate: 0.012, base: 0 },
      { upTo: 300_000, rate: 0.022, base: 3_120 },
      { upTo: 500_000, rate: 0.034, base: 4_000 },
      { upTo: 750_000, rate: 0.0432, base: 10_800 },
      { upTo: 1_000_000, rate: 0.059, base: 21_600 },
      { upTo: Infinity, rate: 0.064, base: 36_350 },
    ],
    fhbFullExemptionUpTo: 1_020_000,
    foreignSurchargeRate: 0,
    titleRegistrationFee: 166,
    mortgageRegistrationFee: 166,
  },
  NT: {
    // NT's real duty formula is a smooth quadratic up to $525,000 then a flat 4.95% above it.
    // Approximated here as a stepped ladder — see file header caveat.
    brackets: [
      { upTo: 100_000, rate: 0.02, base: 0 },
      { upTo: 300_000, rate: 0.035, base: 2_000 },
      { upTo: 525_000, rate: 0.045, base: 9_000 },
      { upTo: Infinity, rate: 0.0495, base: 19_125 },
    ],
    fhbFullExemptionUpTo: 0,
    foreignSurchargeRate: 0,
    titleRegistrationFee: 165,
    mortgageRegistrationFee: 165,
  },
}
