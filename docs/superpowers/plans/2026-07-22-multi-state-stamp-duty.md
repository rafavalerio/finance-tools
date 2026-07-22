# Multi-State Stamp Duty Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mortgage tool's Victoria-only stamp duty/purchase-cost logic with a
generalized engine covering all 8 Australian states/territories, add a state selector to the
form, and keep Victoria as the default so existing saved data and share links are unaffected.

**Architecture:** A new `lib/calculations/stampDuty/` module holds a data table
(`STAMP_DUTY_TABLE`, one `StateDutyConfig` per state) and a single generic engine function
(`calculateStampDuty`) that replaces today's VIC-only `calculateVictorianStampDuty`/
`calculateStandardDuty`. `MortgageInputs` gains a `state: AustralianState` field (default
`'VIC'`), threaded through `calculatePurchaseCosts`, `lib/storage.ts` encode/decode, and a new
`Select` in `MortgageForm`.

**Tech Stack:** TypeScript (strict), Vitest + React Testing Library, no new dependencies.

## Global Constraints

- Prettier: single quotes, no semicolons, trailing commas everywhere, printWidth 100, tabWidth 2
  — run `npm run format` before each commit if editing by hand.
- Victoria must remain the default `state` everywhere (`DEFAULT_INPUTS`, `DEFAULTS`, decode
  fallback) so pre-existing saved/shared data behaves identically to before this change.
- Do not model new-build vs established property distinctions (spec: out of scope).
- Reuse `components/ui` primitives (`Select`) — no raw `<select>`.
- Every new/changed function gets test coverage in this same pass, per this repo's existing
  convention (see `CLAUDE.md`).

---

### Task 1: `AustralianState` type + `MortgageInputs.state` field

**Files:**
- Modify: `types/mortgage.ts`

**Interfaces:**
- Produces: `AustralianState = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT'`,
  `MortgageInputs.state: AustralianState`

This task only changes the type. Every file constructing a `MortgageInputs` literal will fail to
compile until later tasks add `state` to their fixtures — that's expected and gets fixed in
Tasks 4, 6, 7, and 8 below. Do not add `state` to unrelated fixtures in this task; keep it
scoped to the type definition so the diff is easy to review.

- [ ] **Step 1: Add the type and field**

Edit `types/mortgage.ts`, right after `export type BuyerType = ...` (line 5):

```ts
export type AustralianState = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT'
```

Then add `state: AustralianState` to `MortgageInputs`, immediately after `buyerType: BuyerType`:

```ts
export interface MortgageInputs {
  loanAmount: number
  deposit: number
  interestRate: number
  loanTermYears: number
  repaymentFrequency: RepaymentFrequency
  offsetBalance: number
  buyerType: BuyerType
  state: AustralianState
  includeLegalFees: boolean
  includeBuildingInspection: boolean
}
```

- [ ] **Step 2: Confirm the expected compile errors**

Run: `npx tsc --noEmit`
Expected: errors in `lib/calculations/mortgage.ts`, `lib/calculations/mortgage.test.ts`,
`lib/storage.ts`, `lib/storage.test.ts`, `components/tools/mortgage/useMortgageCalculator.ts`,
`components/tools/mortgage/useMortgageCalculator.test.ts`,
`components/tools/mortgage/MortgageForm.test.tsx`, `app/page.test.tsx`,
`components/dashboard/useDashboardData.test.ts` — all "Property 'state' is missing" or similar.
This confirms the type change is wired correctly; each error is resolved by its own task below.

- [ ] **Step 3: Commit**

```bash
git add types/mortgage.ts
git commit -m "Add AustralianState type and state field to MortgageInputs"
```

---

### Task 2: Stamp duty data table

**Files:**
- Create: `lib/calculations/stampDuty/types.ts`
- Create: `lib/calculations/stampDuty/data.ts`
- Test: `lib/calculations/stampDuty/data.test.ts`

**Interfaces:**
- Consumes: `AustralianState` (Task 1), `BuyerType` (`types/mortgage.ts`, pre-existing)
- Produces: `DutyBracket { upTo: number; rate: number; base: number }`, `StateDutyConfig {
brackets: DutyBracket[]; fhbFullExemptionUpTo: number; fhbConcessionUpTo?: number;
foreignSurchargeRate: number; titleRegistrationFee: number; mortgageRegistrationFee: number }`,
  `STAMP_DUTY_TABLE: Record<AustralianState, StateDutyConfig>` — consumed by Task 3 (engine) and
  Task 4 (`calculatePurchaseCosts`' registration fees).

- [ ] **Step 1: Write `types.ts`**

```ts
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
```

- [ ] **Step 2: Write the failing shape test**

```ts
// lib/calculations/stampDuty/data.test.ts
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run lib/calculations/stampDuty/data.test.ts`
Expected: FAIL — `Cannot find module './data'`

- [ ] **Step 4: Write `data.ts`**

Rates below are approximations compiled from each state/territory's published 2025-26 duty
schedules — the same "approximate, verify periodically" caveat this codebase already applies to
Victoria (see the removed `calculateVictorianStampDuty` comment). ACT's real formula uses a
flat averaged rate above $1,455,000 that this table simplifies to a continued marginal bracket;
NT's real formula is a smooth quadratic that this table approximates with a stepped ladder.
Treat ACT's top bracket and all of NT's brackets as the least precise entries.

```ts
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run lib/calculations/stampDuty/data.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Format and commit**

```bash
npm run format
git add lib/calculations/stampDuty/types.ts lib/calculations/stampDuty/data.ts lib/calculations/stampDuty/data.test.ts
git commit -m "Add per-state stamp duty data table"
```

---

### Task 3: Stamp duty engine

**Files:**
- Create: `lib/calculations/stampDuty/engine.ts`
- Test: `lib/calculations/stampDuty/engine.test.ts`

**Interfaces:**
- Consumes: `STAMP_DUTY_TABLE` (Task 2), `AustralianState`/`BuyerType` (`types/mortgage.ts`)
- Produces: `calculateStampDuty(state: AustralianState, propertyPrice: number, buyerType:
BuyerType): { amount: number; description: string }` — consumed by Task 4
  (`calculatePurchaseCosts`)

- [ ] **Step 1: Write the failing tests**

```ts
// lib/calculations/stampDuty/engine.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/calculations/stampDuty/engine.test.ts`
Expected: FAIL — `Cannot find module './engine'`

- [ ] **Step 3: Write `engine.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/calculations/stampDuty/engine.test.ts`
Expected: PASS (all tests)

- [ ] **Step 5: Format and commit**

```bash
npm run format
git add lib/calculations/stampDuty/engine.ts lib/calculations/stampDuty/engine.test.ts
git commit -m "Add generic multi-state stamp duty engine"
```

---

### Task 4: Wire `calculatePurchaseCosts` to the new engine

**Files:**
- Modify: `lib/calculations/mortgage.ts:257-410`
- Modify: `lib/calculations/mortgage.test.ts`

**Interfaces:**
- Consumes: `calculateStampDuty` (Task 3), `STAMP_DUTY_TABLE` (Task 2)
- Produces: `calculatePurchaseCosts(propertyPrice: number, deposit: number, state:
AustralianState, buyerType: BuyerType, includeLegalFees: boolean, includeBuildingInspection:
boolean): PurchaseCosts` (new `state` parameter inserted after `deposit`) — consumed by Task 6
  (`useMortgageCalculator`)

- [ ] **Step 1: Update the failing tests first**

In `lib/calculations/mortgage.test.ts`:

1. Remove the entire `describe('calculateVictorianStampDuty', ...)` block (lines 200-240) — that
   coverage now lives in `lib/calculations/stampDuty/engine.test.ts`.
2. Remove `calculateVictorianStampDuty` from the import list at the top of the file.
3. Update every `calculatePurchaseCosts(...)` call in the `describe('calculatePurchaseCosts', ...)`
   block to pass `state` as the third argument:

```ts
describe('calculatePurchaseCosts', () => {
  it('excludes optional costs when their flags are false', () => {
    const costs = calculatePurchaseCosts(600000, 150000, 'VIC', 'standard', false, false)
    expect(costs.legalFees).toBe(0)
    expect(costs.buildingInspection).toBe(0)
  })

  it('includes optional costs when their flags are true', () => {
    const costs = calculatePurchaseCosts(600000, 150000, 'VIC', 'standard', true, true)
    expect(costs.legalFees).toBe(2000)
    expect(costs.buildingInspection).toBe(650)
  })

  it('deducts total costs from the deposit to get the effective deposit', () => {
    const costs = calculatePurchaseCosts(600000, 150000, 'VIC', 'standard', true, true)
    expect(costs.effectiveDeposit).toBeCloseTo(150000 - costs.totalCosts)
  })

  it('flags LMI as required once the effective deposit drops the LVR below 80%', () => {
    const costs = calculatePurchaseCosts(600000, 60000, 'VIC', 'standard', true, true)
    expect(costs.requiresLMI).toBe(true)
    expect(costs.estimatedLMI).toBeGreaterThan(0)
  })

  it('never lets the effective deposit go negative', () => {
    const costs = calculatePurchaseCosts(50000, 5000, 'VIC', 'standard', true, true)
    expect(costs.effectiveDeposit).toBeGreaterThanOrEqual(0)
  })

  it('uses the selected state\'s registration fees instead of a hardcoded Victorian value', () => {
    const vic = calculatePurchaseCosts(600000, 150000, 'VIC', 'standard', false, false)
    const nsw = calculatePurchaseCosts(600000, 150000, 'NSW', 'standard', false, false)
    expect(vic.titleRegistration).toBe(150)
    expect(vic.mortgageRegistration).toBe(120)
    expect(nsw.titleRegistration).toBe(154)
    expect(nsw.mortgageRegistration).toBe(154)
  })

  it('uses the selected state\'s stamp duty schedule', () => {
    const vic = calculatePurchaseCosts(600000, 150000, 'VIC', 'first_home_buyer', false, false)
    const nsw = calculatePurchaseCosts(600000, 150000, 'NSW', 'first_home_buyer', false, false)
    expect(vic.stampDuty).toBe(0) // VIC FHB exemption cap is $600,000
    expect(nsw.stampDuty).toBe(0) // NSW FHB exemption cap is $800,000
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/calculations/mortgage.test.ts`
Expected: FAIL — `calculatePurchaseCosts` called with wrong number/order of arguments (TS type
error) and `calculateVictorianStampDuty` import no longer resolving until Step 3 lands.

- [ ] **Step 3: Update `mortgage.ts`**

Delete `calculateVictorianStampDuty` and `calculateStandardDuty` entirely (current lines
257-319, from the `/** Calculate Victorian Stamp Duty ... */` comment through the end of
`calculateStandardDuty`). Add the import and rewrite `calculatePurchaseCosts`:

```ts
import { calculateStampDuty } from './stampDuty/engine'
import { STAMP_DUTY_TABLE } from './stampDuty/data'
```

(add these alongside the existing `import { computeSplit } from './household'` line)

```ts
/**
 * Calculate all purchase costs for a property purchase in the given state
 */
export function calculatePurchaseCosts(
  propertyPrice: number,
  deposit: number,
  state: AustralianState,
  buyerType: BuyerType,
  includeLegalFees: boolean,
  includeBuildingInspection: boolean,
): PurchaseCosts {
  const loanAmount = propertyPrice - deposit

  // Stamp duty
  const stampDutyResult = calculateStampDuty(state, propertyPrice, buyerType)
  const stateConfig = STAMP_DUTY_TABLE[state]

  // Legal/Conveyancing fees (typical range $1,500 - $3,000)
  const legalFees = includeLegalFees ? 2000 : 0

  // Title search and registration
  const titleRegistration = stateConfig.titleRegistrationFee

  // Building and pest inspection (~$500 - $800)
  const buildingInspection = includeBuildingInspection ? 650 : 0

  // Mortgage registration fee
  const mortgageRegistration = stateConfig.mortgageRegistrationFee

  // Calculate LMI if applicable
  const estimatedLMI = estimateLMI(propertyPrice, deposit, loanAmount)

  // Total upfront costs (excluding LMI which is usually capitalised)
  const totalCosts =
    stampDutyResult.amount +
    legalFees +
    titleRegistration +
    buildingInspection +
    mortgageRegistration

  // Effective deposit after costs
  const effectiveDeposit = deposit - totalCosts

  // Deposit percentage of property price
  const depositPercentage = (effectiveDeposit / propertyPrice) * 100

  // LMI is required if effective LVR > 80%
  const effectiveLVR = ((propertyPrice - effectiveDeposit) / propertyPrice) * 100
  const requiresLMI = effectiveLVR > 80

  return {
    stampDuty: stampDutyResult.amount,
    stampDutyDescription: stampDutyResult.description,
    legalFees,
    titleRegistration,
    buildingInspection,
    mortgageRegistration,
    totalCosts,
    effectiveDeposit: Math.max(0, effectiveDeposit),
    depositPercentage: Math.max(0, depositPercentage),
    requiresLMI,
    estimatedLMI: requiresLMI ? estimatedLMI : 0,
  }
}
```

Also add `AustralianState` to the type-only import at the top of `mortgage.ts`:

```ts
import {
  MortgageInputs,
  MortgageResults,
  Expense,
  ExpenseFrequency,
  RepaymentFrequency,
  AmortisationDataPoint,
  BuyerType,
  AustralianState,
  PurchaseCosts,
  MemberSplitAmount,
} from '@/types/mortgage'
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/calculations/mortgage.test.ts`
Expected: PASS (all tests, `calculateVictorianStampDuty` describe block gone)

- [ ] **Step 5: Format and commit**

```bash
npm run format
git add lib/calculations/mortgage.ts lib/calculations/mortgage.test.ts
git commit -m "Generalize calculatePurchaseCosts to all states via the stamp duty engine"
```

---

### Task 5: Storage encode/decode + backward compatibility

**Files:**
- Modify: `lib/storage.ts`
- Modify: `lib/storage.test.ts`

**Interfaces:**
- Consumes: `AustralianState` (Task 1)
- Produces: `DEFAULTS.state = 'VIC'` — consumed by Task 6

- [ ] **Step 1: Update the failing tests first**

In `lib/storage.test.ts`, add `state: 'VIC'` to `defaultInputs` and `state: 'NSW'` to
`customData.inputs`:

```ts
const defaultInputs: MortgageInputs = {
  loanAmount: 0,
  deposit: 0,
  interestRate: 0,
  loanTermYears: 30,
  repaymentFrequency: 'monthly',
  offsetBalance: 0,
  buyerType: 'standard',
  state: 'VIC',
  includeLegalFees: true,
  includeBuildingInspection: true,
}

const customData: MortgageStorageData = {
  inputs: {
    loanAmount: 650000,
    deposit: 120000,
    interestRate: 6.25,
    loanTermYears: 25,
    repaymentFrequency: 'fortnightly',
    offsetBalance: 15000,
    buyerType: 'first_home_buyer',
    state: 'NSW',
    includeLegalFees: false,
    includeBuildingInspection: false,
  },
  expenses: [
    { id: '1', name: 'Council Rates', amount: 400, frequency: 'quarterly' },
    { id: '2', name: 'Home Insurance', amount: 1500, frequency: 'annually' },
  ],
}
```

Then add two new test cases inside `describe('encodeMortgageData / decodeMortgageData', ...)`:

```ts
it('round-trips a non-default state', () => {
  const encoded = encodeMortgageData(customData)
  const decoded = decodeMortgageData(encoded)
  expect(decoded!.inputs.state).toBe('NSW')
})

it('falls back to VIC when decoding a payload with no state key (pre-existing share links)', () => {
  const encoded = encodeMortgageData({
    inputs: { ...defaultInputs, loanAmount: 500000 },
    expenses: [],
  })
  const decoded = decodeMortgageData(encoded)
  expect(decoded!.inputs.state).toBe('VIC')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/storage.test.ts`
Expected: FAIL — TS error on the fixtures (missing `state`) and the new state-specific
assertions failing since `decoded!.inputs.state` is `undefined`.

- [ ] **Step 3: Update `lib/storage.ts`**

Add `AustralianState` to the import:

```ts
import {
  MortgageInputs,
  Expense,
  BuyerType,
  AustralianState,
  RepaymentFrequency,
  ExpenseFrequency,
  SplitSnapshotEntry,
} from '@/types/mortgage'
```

Add `state: 'VIC'` to `DEFAULTS`, right after `buyerType: 'standard'`:

```ts
const DEFAULTS: MortgageInputs = {
  loanAmount: 0,
  deposit: 0,
  interestRate: 0,
  loanTermYears: 30,
  repaymentFrequency: 'monthly',
  offsetBalance: 0,
  buyerType: 'standard',
  state: 'VIC',
  includeLegalFees: true,
  includeBuildingInspection: true,
}
```

Add `state: 'st'` to `KEY_MAP`, right after `buyerType: 'b'`:

```ts
const KEY_MAP = {
  loanAmount: 'p', // property price
  deposit: 'd', // deposit
  interestRate: 'r', // rate
  loanTermYears: 't', // term
  repaymentFrequency: 'f', // frequency
  offsetBalance: 'o', // offset
  buyerType: 'b', // buyer
  state: 'st', // state
  includeLegalFees: 'l', // legal
  includeBuildingInspection: 'i', // inspection
} as const
```

Add a state abbreviation map, right after `BUYER_MAP`/`REVERSE_BUYER_MAP`:

```ts
// State abbreviations
const STATE_MAP: Record<AustralianState, string> = {
  NSW: 'NS',
  VIC: 'VI',
  QLD: 'QL',
  WA: 'WA',
  SA: 'SA',
  TAS: 'TA',
  ACT: 'AC',
  NT: 'NT',
}
const REVERSE_STATE_MAP: Record<string, AustralianState> = {
  NS: 'NSW',
  VI: 'VIC',
  QL: 'QLD',
  WA: 'WA',
  SA: 'SA',
  TA: 'TAS',
  AC: 'ACT',
  NT: 'NT',
}
```

In `encodeMortgageData`, add the state encoding right after the `buyerType` block:

```ts
    if (inputs.buyerType !== DEFAULTS.buyerType) {
      compact[KEY_MAP.buyerType] = BUYER_MAP[inputs.buyerType]
    }
    if (inputs.state !== DEFAULTS.state) {
      compact[KEY_MAP.state] = STATE_MAP[inputs.state]
    }
```

In `decodeMortgageData`, add the state decoding branch right after the `buyerType` branch:

```ts
      } else if (fullKey === 'buyerType' && typeof value === 'string') {
        inputs.buyerType = REVERSE_BUYER_MAP[value] || DEFAULTS.buyerType
      } else if (fullKey === 'state' && typeof value === 'string') {
        inputs.state = REVERSE_STATE_MAP[value] || DEFAULTS.state
      } else if (fullKey === 'includeLegalFees') {
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/storage.test.ts`
Expected: PASS (all tests, including the two new ones)

- [ ] **Step 5: Format and commit**

```bash
npm run format
git add lib/storage.ts lib/storage.test.ts
git commit -m "Thread state through mortgage storage encode/decode with VIC fallback"
```

---

### Task 6: Wire `useMortgageCalculator` and its fixtures

**Files:**
- Modify: `components/tools/mortgage/useMortgageCalculator.ts:21-31,97-116`
- Modify: `components/tools/mortgage/useMortgageCalculator.test.ts`
- Modify: `app/page.test.tsx`
- Modify: `components/dashboard/useDashboardData.test.ts`

**Interfaces:**
- Consumes: `calculatePurchaseCosts(propertyPrice, deposit, state, buyerType, includeLegalFees,
includeBuildingInspection)` (Task 4)

- [ ] **Step 1: Update fixtures (these files construct `MortgageInputs` literals directly and
      need `state` to compile)**

In `components/tools/mortgage/useMortgageCalculator.test.ts`, add `state: 'VIC'` to `baseInputs`:

```ts
const baseInputs: MortgageInputs = {
  loanAmount: 0,
  deposit: 0,
  interestRate: 0,
  loanTermYears: 30,
  repaymentFrequency: 'monthly',
  offsetBalance: 0,
  buyerType: 'standard',
  state: 'VIC',
  includeLegalFees: true,
  includeBuildingInspection: true,
}
```

In `app/page.test.tsx`, add `state: 'VIC'` to `savedInputs`:

```ts
const savedInputs: MortgageInputs = {
  loanAmount: 600000,
  deposit: 100000,
  interestRate: 6,
  loanTermYears: 30,
  repaymentFrequency: 'monthly',
  offsetBalance: 0,
  buyerType: 'standard',
  state: 'VIC',
  includeLegalFees: true,
  includeBuildingInspection: true,
}
```

In `components/dashboard/useDashboardData.test.ts`, add `state: 'VIC'` to `savedInputs` (same
shape as above).

- [ ] **Step 2: Run tests to verify they still fail on the production code**

Run: `npx vitest run components/tools/mortgage/useMortgageCalculator.test.ts app/page.test.tsx components/dashboard/useDashboardData.test.ts`
Expected: FAIL — `calculatePurchaseCosts` call site in `useMortgageCalculator.ts` still passes
the old 5-argument signature, so `purchaseCosts` computes with the wrong arguments (TS error).

- [ ] **Step 3: Update `useMortgageCalculator.ts`**

Add `state: 'VIC'` to `DEFAULT_INPUTS`, right after `buyerType: 'standard'`:

```ts
const DEFAULT_INPUTS: MortgageInputs = {
  loanAmount: 0,
  deposit: 0,
  interestRate: 0,
  loanTermYears: 30,
  repaymentFrequency: 'monthly',
  offsetBalance: 0,
  buyerType: 'standard',
  state: 'VIC',
  includeLegalFees: true,
  includeBuildingInspection: true,
}
```

Update the `purchaseCosts` memo's call and dependency array:

```ts
  const purchaseCosts = useMemo(() => {
    if (inputs.loanAmount > 0 && inputs.deposit > 0) {
      return calculatePurchaseCosts(
        inputs.loanAmount,
        inputs.deposit,
        inputs.state,
        inputs.buyerType,
        inputs.includeLegalFees,
        inputs.includeBuildingInspection,
      )
    }
    return null
  }, [
    inputs.loanAmount,
    inputs.deposit,
    inputs.state,
    inputs.buyerType,
    inputs.includeLegalFees,
    inputs.includeBuildingInspection,
  ])
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run components/tools/mortgage/useMortgageCalculator.test.ts app/page.test.tsx components/dashboard/useDashboardData.test.ts`
Expected: PASS (all tests)

- [ ] **Step 5: Format and commit**

```bash
npm run format
git add components/tools/mortgage/useMortgageCalculator.ts components/tools/mortgage/useMortgageCalculator.test.ts app/page.test.tsx components/dashboard/useDashboardData.test.ts
git commit -m "Pass selected state through to calculatePurchaseCosts"
```

---

### Task 7: State selector in `MortgageForm`

**Files:**
- Modify: `components/tools/mortgage/MortgageForm.tsx`
- Modify: `components/tools/mortgage/MortgageForm.test.tsx`

**Interfaces:**
- Consumes: `AustralianState` (Task 1)

- [ ] **Step 1: Update the failing tests first**

In `components/tools/mortgage/MortgageForm.test.tsx`, add `state: 'VIC'` to the `inputs` fixture:

```ts
const inputs: MortgageInputs = {
  loanAmount: 500000,
  deposit: 100000,
  interestRate: 6,
  loanTermYears: 30,
  repaymentFrequency: 'monthly',
  offsetBalance: 0,
  buyerType: 'standard',
  state: 'VIC',
  includeLegalFees: true,
  includeBuildingInspection: true,
}
```

Add a state assertion to the existing "reflects the current input values" test, and a new
interaction test:

```ts
  it('reflects the current input values', () => {
    render(<MortgageForm inputs={inputs} onChange={() => {}} />)
    expect(screen.getByLabelText('Property Price')).toHaveValue(500000)
    expect(screen.getByLabelText('Your Deposit')).toHaveValue(100000)
    expect(screen.getByLabelText('Interest Rate (% p.a.)')).toHaveValue(6)
    expect(screen.getByLabelText('Repayment Frequency')).toHaveValue('monthly')
    expect(screen.getByLabelText('Buyer Type')).toHaveValue('standard')
    expect(screen.getByLabelText('State')).toHaveValue('VIC')
  })
```

```ts
  it('calls onChange when the state select changes', async () => {
    const onChange = vi.fn()
    render(<MortgageForm inputs={inputs} onChange={onChange} />)
    await userEvent.selectOptions(screen.getByLabelText('State'), 'NSW')
    expect(onChange).toHaveBeenCalledWith({ ...inputs, state: 'NSW' })
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run components/tools/mortgage/MortgageForm.test.tsx`
Expected: FAIL — `screen.getByLabelText('State')` finds no element; TS error on the `inputs`
fixture until `state` is added (add it as part of this same failing-test step, per the code
above).

- [ ] **Step 3: Update `MortgageForm.tsx`**

Add `AustralianState` to the type import:

```ts
import { MortgageInputs, RepaymentFrequency, BuyerType, AustralianState } from '@/types/mortgage'
```

Add the options list, right after `buyerTypeOptions`:

```ts
const stateOptions = [
  { value: 'NSW', label: 'New South Wales' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'SA', label: 'South Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'ACT', label: 'Australian Capital Territory' },
  { value: 'NT', label: 'Northern Territory' },
]
```

Add the `Select`, right after the "Buyer Type" `Select` in the grid (still inside the same
`grid grid-cols-1 md:grid-cols-2 gap-4` container):

```tsx
            <Select
              label="Buyer Type"
              options={buyerTypeOptions}
              value={inputs.buyerType}
              onChange={(e) => handleChange('buyerType', e.target.value as BuyerType)}
            />
            <Select
              label="State"
              options={stateOptions}
              value={inputs.state}
              onChange={(e) => handleChange('state', e.target.value as AustralianState)}
            />
```

Update the subtitle to reflect the selected state instead of always saying Victorian:

```tsx
        <p className="text-sm text-muted mt-1">{inputs.state} stamp duty rates applied</p>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run components/tools/mortgage/MortgageForm.test.tsx`
Expected: PASS (all tests)

- [ ] **Step 5: Format and commit**

```bash
npm run format
git add components/tools/mortgage/MortgageForm.tsx components/tools/mortgage/MortgageForm.test.tsx
git commit -m "Add state selector to the mortgage form"
```

---

### Task 8: Full-suite verification

**Files:** none (verification only)

- [ ] **Step 1: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 2: Run the full test suite**

Run: `npm run test`
Expected: all tests pass, no skipped/failing suites

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 4: Manual smoke test in the dev server**

Run: `npm run dev`, open `/tools/mortgage`, change "State" to NSW, confirm the stamp duty
figure and the subtitle both update, then switch back to VIC and confirm the numbers match what
the tool showed before this change (e.g. $500,000 property, standard buyer, VIC stamp duty
should be unchanged from pre-change behavior).

- [ ] **Step 5: Final format pass and commit if anything changed**

```bash
npm run format
git status
```

If `git status` shows no changes, nothing to commit — the task is done. Otherwise:

```bash
git add -A
git commit -m "Format after multi-state stamp duty changes"
```
