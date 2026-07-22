# Multi-State Stamp Duty & Purchase Costs — Design

## Context & goal

The mortgage tool's purchase-cost calculation (`calculateVictorianStampDuty`,
`calculateStandardDuty`, and the hardcoded title/mortgage registration fees in
`lib/calculations/mortgage.ts`) is Victoria-only. Stamp duty brackets, first-home-buyer
exemptions/concessions, foreign-purchaser surcharge rates, and registration fees all differ
materially by state or territory (e.g. ACT and NT have no foreign surcharge at all; some states
offer a sliding FHB concession band above their exemption threshold, others cut off at a flat
cliff). This round generalizes the calculation to all 8 Australian states/territories and adds a
state selector to the mortgage form, while keeping Victoria as the default so existing saved
data and share links are unaffected.

## Out of scope

- Distinguishing new-build vs established property for FHB eligibility (some states, e.g. QLD
  and SA, only extend their full exemption to new homes). Matching the existing VIC fidelity
  (no such distinction), same as today — call this out via each state's `description` string
  where it materially matters, but don't model it as a separate input.
- Investment-property vs owner-occupier duty differences (not modeled anywhere today).
- Land tax, foreign purchaser land tax surcharges, or anything beyond one-off purchase costs.
- Auto-detecting state from a postcode/address — the user picks it explicitly.

## 1. Data model

`types/mortgage.ts` gains:

```ts
export type AustralianState = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT'
```

`MortgageInputs` gains `state: AustralianState`. `DEFAULT_INPUTS`
(`useMortgageCalculator.ts`) and `DEFAULTS` (`lib/storage.ts`) both default it to `'VIC'` —
every existing saved/shared payload that predates this field merges in `'VIC'` via the existing
`{ ...DEFAULTS, ...parsed }` pattern, so behavior for existing users is unchanged.

## 2. `lib/calculations/stampDuty/` module

New folder, replacing `calculateVictorianStampDuty`/`calculateStandardDuty` in `mortgage.ts`:

- **`types.ts`** — `DutyBracket { upTo: number; rate: number; base: number }` (marginal rate
  `rate` applies above the previous bracket's `upTo`, `base` is the cumulative duty already
  payable at the start of the bracket — same shape as VIC's current tiers, just data instead of
  an if/else chain) and `StateDutyConfig { brackets: DutyBracket[]; fhbFullExemptionUpTo: number;
fhbConcessionUpTo?: number; foreignSurchargeRate: number; titleRegistrationFee: number;
mortgageRegistrationFee: number }`. `fhbConcessionUpTo` is optional: present for states with a
  sliding concession band above the exemption (VIC, WA, NSW); absent for states where the
  exemption simply ends at a cliff (QLD, SA, TAS, ACT — standard duty applies in full above the
  threshold, matching how those states' schemes actually work).

- **`data.ts`** — `STAMP_DUTY_TABLE: Record<AustralianState, StateDutyConfig>`, one entry per
  state. VIC's entry is a direct port of the current `calculateStandardDuty` tiers ($25k/$130k/
  $960k/$2M) plus `fhbFullExemptionUpTo: 600_000`, `fhbConcessionUpTo: 750_000`,
  `foreignSurchargeRate: 0.08`, `titleRegistrationFee: 150`, `mortgageRegistrationFee: 120` (all
  unchanged from today). The other 7 states are populated from current public rate schedules;
  file-level comment (mirroring the existing "Rates as of 2024/2025" comment style) notes these
  should be periodically checked against each state's revenue office, since thresholds move
  roughly yearly (NSW and QLD already updated within the last 12 months). ACT and NT get
  `foreignSurchargeRate: 0`.

- **`engine.ts`** — single exported `calculateStampDuty(state: AustralianState, propertyPrice:
number, buyerType: BuyerType): { amount: number; description: string }`:
  1. Look up `STAMP_DUTY_TABLE[state]`.
  2. `calculateBracketDuty(brackets, propertyPrice)` — generic marginal walk (replaces the
     if/else chain in today's `calculateStandardDuty`, same math).
  3. If `buyerType === 'first_home_buyer'`: `propertyPrice <= fhbFullExemptionUpTo` → `{ amount:
0, description }`; else if `fhbConcessionUpTo` is defined and `propertyPrice <=
fhbConcessionUpTo` → same linear sliding-scale formula VIC uses today, generalized to the
     config's two thresholds; else falls through to standard duty (this covers both "above the
     concession band" and "state has no concession band" in one branch, same as today's `else`
     for VIC amounts above $750k).
  4. If `buyerType === 'foreign_buyer'`: standard duty + `propertyPrice * foreignSurchargeRate`
     (0 for ACT/NT, so this is a no-op there but doesn't need special-casing).
  5. Otherwise: standard duty.
  Description strings follow the existing wording pattern ("First Home Buyer - Full exemption
  (property ≤ $X)", "Includes N% foreign buyer surcharge", "Standard {state} stamp duty").

`lib/calculations/mortgage.ts`'s `calculatePurchaseCosts` takes a new `state: AustralianState`
param, calls `calculateStampDuty(state, ...)` instead of `calculateVictorianStampDuty`, and reads
`titleRegistration`/`mortgageRegistration` from `STAMP_DUTY_TABLE[state]` instead of the
hardcoded `150`/`120`. `calculateVictorianStampDuty` and `calculateStandardDuty` are deleted from
`mortgage.ts` entirely (not kept as deprecated wrappers).

## 3. Storage & share links

`lib/storage.ts`:

- `KEY_MAP.state = 'st'`
- `STATE_MAP`/`REVERSE_STATE_MAP`: 2-character codes (`NS`, `VI`, `QL`, `WA`, `SA`, `TA`, `AC`,
  `NT`) following the same abbreviation pattern as `BUYER_MAP`
- Encoded only when `state !== 'VIC'` (existing "only non-default values" convention)
- Decode: unrecognized/missing code falls back to `'VIC'` via `REVERSE_STATE_MAP[value] ||
DEFAULTS.state`, same fallback style as `buyerType`/`repaymentFrequency` — so any share link
  generated before this change (no `st` key at all) still resolves to VIC, unchanged behavior.

## 4. UI

`MortgageForm.tsx`: a `Select` labeled "State" placed directly beside the existing "Buyer Type"
select (both feed `calculatePurchaseCosts`, so grouping them together keeps the form's "who is
buying, where" section coherent). Options listed `NSW, VIC, QLD, WA, SA, TAS, ACT, NT`, default
`VIC`. No reset of other fields when state changes — buyer type, legal fees, etc. are orthogonal.

`useMortgageCalculator.ts`'s `purchaseCosts` memo passes `inputs.state` through to
`calculatePurchaseCosts` and adds it to the dependency array.

## Testing

- `lib/calculations/stampDuty/engine.test.ts` (new) — for every state: standard duty at a
  representative price point, FHB full exemption, FHB concession band (where the state has one)
  vs FHB cliff-to-standard (where it doesn't), foreign buyer surcharge (0% no-op for ACT/NT,
  non-zero elsewhere). Mirrors the structure of today's `calculateVictorianStampDuty` describe
  block in `mortgage.test.ts`, which gets removed since that logic moves out.
- `lib/calculations/mortgage.test.ts` — update `calculatePurchaseCosts` call sites to pass
  `state`, add a case asserting a non-VIC state uses that state's registration fees.
- `lib/storage.test.ts` — round-trip test for the new `st` key, plus a case decoding a payload
  with no `st` key at all (simulating a pre-existing share link) and asserting it falls back to
  `'VIC'`.
- `components/tools/mortgage/MortgageForm.test.tsx` — render includes the new State select,
  interaction test for changing it.
