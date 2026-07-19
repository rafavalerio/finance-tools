# Household/Profile Layer & Unified App Shell — Design

## Context & goal

Finance Tools currently ships one tool (mortgage calculator) reached from a card-grid home page.
Each tool owns all of its own state independently — there's no shared concept of "who lives in
this household" or "what do they earn." The mortgage calculator's "per person" cost split is
literally `totalMonthlyOutgoing / 2`, a hardcoded assumption with no real data behind it.

The direction: turn this from "a dashboard linking to standalone tools" into one unified app —
you configure a household once (yourself, a partner, other members, their incomes), and every
tool draws on that shared data. This round of work builds the household/profile layer and the
navigation shell that makes it central to the app. It does **not** build the budget-planning
tool itself — that's a separate, later project that will be the first real consumer (alongside
mortgage) of this layer.

## Out of scope

- The budget-planning tool (or any new tool beyond mortgage)
- Authentication / login
- A real backend or database — this stays 100% client-side, localStorage-backed, exactly like
  today. The design below anticipates a future login + database backend and makes that swap
  cheap, but does not build it.

## 1. Data model, module layout & storage abstraction

### Type

`types/household.ts`:

```ts
export interface HouseholdMember {
  id: string
  name: string
  income: number
}
```

Deliberately minimal — no relationship/type field for now (e.g. "partner" vs "housemate").
Household members are a flat list; "you" are just the first entry, with no special primary-user
distinction in the data.

### Module layout

Household is its own module, not nested under any tool, split the same way the rest of the repo
splits pure logic (`lib/`) from UI/hooks (`components/`):

- `lib/household/repository.ts` — the swappable interface:

  ```ts
  export interface HouseholdRepository {
    getMembers(): Promise<HouseholdMember[]>
    saveMembers(members: HouseholdMember[]): Promise<void>
  }
  ```

- `lib/household/localStorageRepository.ts` — today's implementation. Wraps a localStorage
  read/write (same pattern as `lib/storage.ts`) in `Promise.resolve(...)`. The interface is
  async even though localStorage is synchronous — that's what lets a future
  `ApiHouseholdRepository` (real HTTP calls to a database, behind a login) drop in later without
  touching any caller.
- `lib/household/index.ts` — exports a single `householdRepository` instance. Migrating to a
  real backend later means writing one new class and changing the one line that constructs this
  instance — nothing else in the app changes.
- `lib/calculations/household.ts` — pure function, no React, alongside
  `lib/calculations/mortgage.ts`:

  ```ts
  function computeSplit(
    members: HouseholdMember[],
    mode: 'even' | 'income',
  ): Record<string, number> // memberId -> share ratio (0-1)
  ```

  `mode: 'income'` falls back to even split if any included member has `income <= 0`.
- `components/household/useHousehold.ts` — the hook every page/tool consumes. Loads via
  `householdRepository.getMembers()` on mount, exposes `members`, `isLoaded`, `addMember`,
  `updateMember`, `removeMember`; writes go through `householdRepository.saveMembers()`. This is
  the only thing tools/pages import — nothing talks to the repository directly.
- `components/household/` also holds the household editor UI (member list, add/edit/remove
  form), used by the Profile page.

## 2. App shell & routing

`components/layout/TopNav.tsx`, mounted once in `app/layout.tsx` so it persists across every
route:

```
💰 Finance Tools     Profile   Mortgage   Budget (soon)
```

- Follows the existing mobile-collapse idiom already used by `components/ui/HeaderActions.tsx`:
  inline links from `sm:` up, collapsing to a hamburger/menu button below `sm:`, same
  click-outside/Escape-to-close behavior.
- Active route gets the existing accent-color treatment used elsewhere (`text-accent`).
- "Budget (soon)" renders disabled/muted, not a link — same treatment as today's "More Coming
  Soon" placeholder.

Routes:

- `/` — the dashboard (rewrites `app/page.tsx`, replacing the card grid and `ToolCard`)
- `/profile` — new route, the household editor
- `/tools/mortgage` — unchanged location, wired to read/write household data

## 3. Dashboard content & empty states

`app/page.tsx` becomes a 3-card grid (existing `Card` primitives), each card independently empty
or filled:

**Household card**

- Configured (≥1 member): member count + combined income (e.g. "2 members · $175k/yr"), names
  listed, links to `/profile`.
- Empty: dashed/muted card, "Set up your household" CTA → `/profile`.

**Mortgage card**

- Configured: reads saved inputs via the existing `loadMortgageData()`, runs them through the
  existing pure `lib/calculations/mortgage.ts` functions (no duplicated logic) to get
  `monthlyMortgagePayment` and `payoffDate`, shows both, links to `/tools/mortgage`.
- Empty: dashed/muted card, "Get started" CTA → `/tools/mortgage`.

**Budget card**

- Always the static disabled "Coming soon" placeholder — today's treatment, now the third grid
  slot.

Cards are independent: e.g. household configured but mortgage untouched shows one filled card
and one CTA card side by side, never a single all-or-nothing empty screen.

## 4. Mortgage integration & sharing

### New `MortgageInputs` fields

- `splitMemberIds: string[]` — household members included in this mortgage's cost split
- `splitMode: 'even' | 'income'` — defaults to `'even'`

Defaults to all current household members selected the first time a household exists.

### Form UI

A new "Split between" section in the mortgage form: a checklist of household members (via
`useHousehold()`, using the existing `Checkbox` primitive) plus a small even/income toggle built
from the existing `Button` primitive (no new UI primitive needed). If the household has fewer
than 2 members, this section doesn't render — nothing to split.

### Calculation

`calculateMortgageResults()` in `lib/calculations/mortgage.ts` gains a `members:
HouseholdMember[]` parameter, filters to `inputs.splitMemberIds`, and calls `computeSplit()`
from `lib/calculations/household.ts` (a calc-to-calc dependency; still zero React).
`MortgageResults.perPersonAmount` (a single number) is replaced with:

```ts
splitBreakdown: { memberId: string; name: string; amount: number }[]
```

Empty when fewer than 2 members are selected. `ResultsSummary.tsx` renders named rows ("Rafael:
$1,200/mo", "Partner: $1,140/mo") when `splitBreakdown` is non-empty; otherwise just the
existing total with no split tile. This replaces today's hardcoded "÷2 / Per Person" assumption
entirely.

### Sharing

Share links are self-contained (no server, no auth) — this is the one place household data
crosses a boundary. `encodeMortgageData` snapshots the split at share time — member **names +
computed amounts**, not IDs — into the compact URL blob (e.g. `sp: [{n: 'Rafael', a: 1200},
...]`). A recipient sees that frozen breakdown regardless of their own household state. The
moment they edit any mortgage input afterward, the split recomputes live from *their own* local
household/`splitMemberIds`, replacing the frozen snapshot — same pattern as every other field in
the existing encode/decode flow.

## 5. Testing

Every new/changed file gets a test in the same pass, per this repo's existing convention:

| File | Coverage |
|---|---|
| `lib/calculations/household.ts` | `computeSplit`: even split, income-weighted split, fallback to even when an included member has zero/missing income, single-member and empty-list edge cases |
| `lib/household/localStorageRepository.ts` | get/save round-trip, mocked `localStorage`, matching `lib/storage.test.ts`'s style |
| `components/household/useHousehold.ts` | load-on-mount, `addMember`/`updateMember`/`removeMember`, persistence calls into the repository — mirrors `useMortgageCalculator.test.ts` |
| `components/household/*` (member list/form) | render + add/edit/remove interactions |
| `components/layout/TopNav.tsx` | active-link highlighting, mobile menu open/close (same click-outside/Escape assertions as `HeaderActions.test.tsx`) |
| `app/page.tsx` (dashboard) | replaces existing `page.test.tsx`; empty vs. filled states for household card and mortgage card, independently |
| `app/profile/page.tsx` | new page test |
| `lib/calculations/mortgage.ts` | update existing tests for the new `members`/`splitMode` params and `splitBreakdown` output replacing `perPersonAmount` |
| `lib/storage.ts` | update `encodeMortgageData`/`decodeMortgageData` tests for `splitMemberIds`, `splitMode`, and the share-snapshot (`sp`) field |
| `components/tools/mortgage/ResultsSummary.tsx` | update existing test for named split rows vs. no-split state |
| `components/tools/mortgage/MortgageForm.tsx` | add tests for the new "Split between" checklist + even/income toggle |
