# Household-Level Split Config & Member List Polish — Design

## Context & goal

Cost-splitting (which household members share a cost, and whether evenly or by income) is
currently configured inline on the mortgage tool's form, as part of `MortgageInputs`
(`splitMemberIds`, `splitMode`). That's the only tool that exists today, but a budget tool is
coming next and will need the same split concept. Per-tool split config means re-implementing
(and re-configuring) the same UI on every tool that needs it.

This round moves split configuration to the household page as a single household-level setting
— "this is how we split shared costs," set once, reused by every tool. It also tidies up the
household member list UI, which currently looks stretched/misaligned.

## Out of scope

- The budget tool itself (separate, later project — this spec only prepares the split-config
  data model it will consume)
- Per-tool split overrides (e.g. "mortgage splits between everyone, but this one recurring
  expense splits differently") — out of scope unless a real need shows up later
- Any backend/auth work — stays 100% client-side/localStorage, same as today

## 1. Data model & storage

`types/household.ts` gains:

```ts
export interface HouseholdSplitConfig {
  memberIds: string[]
  mode: SplitMode
}
```

`lib/household/repository.ts`'s `HouseholdRepository` interface gains
`getSplitConfig(): Promise<HouseholdSplitConfig>` and
`saveSplitConfig(config: HouseholdSplitConfig): Promise<void>`, implemented by
`LocalStorageHouseholdRepository` under a new `finance-tools-household-split` key, following the
exact same get/save/try-catch shape as `getMembers`/`saveMembers`. Default when nothing is saved:
`{ memberIds: [], mode: 'even' }`.

`components/household/useHousehold()` loads `splitConfig` alongside `members` on mount and
exposes it plus two setters: `toggleSplitMember(id: string, included: boolean)` and
`setSplitMode(mode: SplitMode)`, each persisting via the repository the same way
`addMember`/`updateMember`/`removeMember` do today.

The "auto-select every member the first time there are 2+ and nothing's been configured yet"
behavior currently lives in `useMortgageCalculator` (guarded by `hasSeededSplitRef`, fires once,
never re-applies after a manual deselection). It moves into `useHousehold`, keyed off
`splitConfig.memberIds.length === 0` instead of the mortgage-specific `hadSavedMortgageData`
flag, same ref-guard pattern.

## 2. New UI: `SplitConfigCard`

`components/household/SplitConfigCard.tsx` (+ test, barrel-exported from
`components/household/index.ts`): a `Card` containing the member-selection checkboxes and the
"Split evenly" / "Split by income" button toggle — the same markup currently in `MortgageForm`
(lines ~139–175), relocated. Rendered only when `members.length >= 2`, matching today's
threshold for when splitting is meaningful.

`app/profile/page.tsx` renders it as its own card directly below `MemberList`, both sourced from
one `useHousehold()` call.

## 3. Mortgage tool changes

- `MortgageInputs` (`types/mortgage.ts`) drops `splitMemberIds`/`splitMode` entirely.
- `calculateMortgageResults` (`lib/calculations/mortgage.ts`) takes a new `splitConfig:
HouseholdSplitConfig` parameter instead of reading `inputs.splitMemberIds`/`inputs.splitMode`;
  the `computeSplit` call and `splitMembers` filtering logic otherwise stay the same.
- `MortgageForm` loses the entire "Cost split" block and the now-unused `members` prop (nothing
  else in the form reads it).
- `useMortgageCalculator` reads `splitConfig` from `useHousehold()` and passes it to
  `calculateMortgageResults`; the seed-effect it owned is deleted (moved to `useHousehold`, see
  above).
- `lib/storage.ts`: `DEFAULTS`, `loadMortgageData`'s merge fallback, and the explanatory comment
  about split fields never being encoded all go away — there's nothing split-related left in
  `MortgageInputs` to explain away or default-fill.

## 4. Member list UI polish

`MemberItem`'s current `flex-col sm:flex-row gap-3 items-start sm:items-end` layout is what
reads as stretched — loose spacing and a remove button that floats oddly relative to the inputs.
Replace it with a tighter `grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-3 items-end` row,
consistent padding, same `Input`/`Button` primitives. `MemberList`'s card/header/empty-state
wrapper is unaffected.

## Testing

- `lib/household/localStorageRepository.test.ts`: extend with get/save round-trip + corrupt-data
  fallback coverage for `getSplitConfig`/`saveSplitConfig`, mirroring the existing member tests.
- `components/household/useHousehold.test.ts`: cover loading `splitConfig`, `toggleSplitMember`,
  `setSplitMode`, and the auto-seed-on-2+-members behavior (moved from
  `useMortgageCalculator.test.ts`).
- `components/household/SplitConfigCard.test.tsx`: new — render with <2 members (hidden), 2+
  members (checkboxes + toggle), interaction tests for toggling a member and switching mode.
- `components/tools/mortgage/MortgageForm.test.tsx` / `useMortgageCalculator.test.ts`: remove
  now-dead split-related test cases; update remaining ones for the dropped `members` prop /
  `splitConfig` parameter.
- `lib/calculations/mortgage.test.ts`: update `calculateMortgageResults` calls to pass
  `splitConfig` instead of embedding split fields in `inputs`.
- `lib/storage.test.ts`: remove split-field assertions that no longer apply.
