# Finance Tools

Personal finance toolkit built with Next.js (App Router). Ships a dashboard home page, a
household/profile system shared across tools, and one tool so far — a mortgage calculator
covering all eight Australian states/territories — with more tools planned as new routes under
`app/tools/`.

## Stack

- Next.js 16 (App Router), React 19, TypeScript (strict)
- Tailwind CSS v4, `tw-animate-css` (imported in `app/globals.css`) for the `animate-in`/
  `fade-in`/`zoom-in-95`/`slide-in-from-*`/`duration-*` utilities used on every modal and
  dropdown (`Modal`, `HeaderActions`, `ProfileMenu`, `NavDrawer`, `NavDropdown`) — without this
  import those class names don't exist and silently do nothing (no error, just no animation)
- Recharts for charts
- lucide-react for icons
- No backend/database — everything is client-side (`'use client'`), state persisted to
  `localStorage` and optionally shareable via a base64-encoded URL param
- ESLint (`eslint-config-next`) + Prettier (`.prettierrc`: single quotes, no semicolons, trailing
  commas everywhere, printWidth 100, tabWidth 2; `.prettierignore` excludes
  `docs/superpowers/` — those plans/specs are written prose, not code, and shouldn't be
  reformatted by `npm run format`)

## Commands

- `npm run dev` — start dev server
- `npm run build` / `npm run start` — production build/run
- `npm run lint` — ESLint
- `npm run format` — Prettier write
- `npm run test` — run the Vitest suite once
- `npm run test:watch` — Vitest in watch mode

## Testing

- Vitest + React Testing Library (`@testing-library/react`, `@testing-library/user-event`,
  `jest-dom` matchers), jsdom environment. Config: `vitest.config.ts` / `vitest.setup.ts`.
- Tests live next to the code they cover as `*.test.ts(x)`.
- `lib/calculations/mortgage.test.ts`, `lib/calculations/household.test.ts`, `lib/storage.test.ts`
  — pure-function unit tests.
- `lib/household/localStorageRepository.test.ts` — repository get/save round-trip against a
  mocked `localStorage`.
- `components/ui/*.test.tsx` — render + interaction tests for every shared primitive.
- `components/layout/*.test.tsx`, `components/household/*.test.tsx`, `components/dashboard/*.test.ts(x)`
  — nav/drawer/menu interaction tests, household editor tests, dashboard hook/card tests.
- `components/tools/mortgage/*.test.tsx` — interaction tests for form/list components.
- When adding a new tool or component, add its test file alongside it in the same pass — this
  repo's expectation is coverage for everything, not just the tricky bits.

## Structure

- `app/page.tsx` — dashboard home page; composes `useDashboardData()` with per-tool summary
  cards (`MortgageSnapshotCard`, `BudgetPlaceholderCard`)
- `app/profile/page.tsx` — household editor page (`MemberList` + `useHousehold()`)
- `app/tools/<tool-name>/page.tsx` — one route per tool
- `components/layout/` — app chrome shared by every page: `TopNav` (persistent header, renders
  globally from `app/layout.tsx`), `NavDrawer` (slide-out tool picker opened from `TopNav`'s
  hamburger button), `ProfileMenu` (household summary dropdown, links to `/profile`),
  `PageContainer` (shared max-width/padding wrapper — use this instead of a one-off wrapper
  `<div>` on any new page), `ToolHeader` (title + `HeaderActions` row for tool pages)
- `components/household/` — `MemberList`/`MemberItem` (editor UI) and `useHousehold()` (loads/
  persists members via `lib/household`'s repository); barrel-exported so other features only
  ever import from `@/components/household`
- `components/dashboard/` — `useDashboardData()` plus the summary cards it feeds
  (`MortgageSnapshotCard`, `BudgetPlaceholderCard`) shown on `app/page.tsx`
- `components/tools/<tool-name>/` — tool-specific components; also where tool-specific hooks
  live (e.g. `useMortgageCalculator.ts`, which owns the mortgage page's state, persistence
  effects, and derived-data `useMemo`s, keeping `page.tsx` itself just layout/composition)
- `components/charts/` — Recharts wrappers (e.g. `AmortisationChart`, `ExpenseBreakdownChart`),
  plus `theme.ts` (shared chart colors and Recharts tooltip styling — don't hardcode `rgb(...)`
  chart colors in individual chart or page components, import from here instead)
- `components/ui/` — shared primitives (`Button`, `Card`, `Input`, `Select`, `Checkbox`,
  `Modal`, `HeaderActions`), plus `icons.tsx` (re-exports `lucide-react` icons under semantic
  names, e.g. `Home as HouseIcon` — add new icons here rather than importing `lucide-react`
  directly in a page/component, so there's one place that maps "what it's for" to "which lucide
  icon"), each barrel-exported via the folder's `index.ts`
- `lib/calculations/<tool-name>.ts` — pure calculation functions, no React (also
  `lib/calculations/household.ts` — not tool-specific, shared by the mortgage tool's cost split
  and the dashboard/profile summaries)
- `lib/calculations/stampDuty/` — the generic multi-state stamp duty engine used by the mortgage
  tool: `types.ts` (`DutyBracket`, `StateDutyConfig`), `data.ts` (`STAMP_DUTY_TABLE`, one
  `StateDutyConfig` per `AustralianState` — approximate 2025-26 schedules, verify against each
  state revenue office before relying on them for a real purchase), `engine.ts` (bracket
  calculation + FHB exemption/concession + foreign-buyer surcharge, state-agnostic)
- `lib/household/` — `HouseholdRepository` interface plus `LocalStorageHouseholdRepository`, the
  swappable persistence layer behind `useHousehold()` (see Household & navigation below)
- `lib/storage.ts` — localStorage persistence + compact URL encode/decode for shareable links
- `types/<tool-name>.ts` — shared TS types for a tool (`types/household.ts` is the exception —
  shared across tools/pages rather than scoped to one, since household data isn't itself a tool)

## Household & navigation

- `types/household.ts`: `HouseholdMember { id, name, income }`, `SplitMode = 'even' | 'income'`,
  `HouseholdSplitConfig { memberIds, mode }` — the split config is household-level, not
  per-tool, so every tool that needs a cost split reads the same config
- `lib/household/repository.ts` defines `HouseholdRepository` (`getMembers`/`saveMembers`/
  `getSplitConfig`/`saveSplitConfig`); `localStorageRepository.ts` is the only implementation
  today (members under one `localStorage` key, split config under a separate one), exported as a
  `householdRepository` singleton from `lib/household/index.ts`. Swap the singleton for a
  different implementation of the same interface if household data ever moves off `localStorage`
  — nothing above this layer should need to change
- `components/household/useHousehold()` loads members and split config on mount via
  `householdRepository` and exposes `members`, `splitConfig`, `isLoaded`, `addMember`,
  `updateMember`, `removeMember`, `toggleSplitMember`, `setSplitMode`; every page/tool that needs
  household data (`/profile`, the mortgage tool, `ProfileMenu`, the dashboard) goes through this
  one hook rather than touching the repository directly. Auto-seeds `splitConfig.memberIds` to
  every member the first time there are 2+ members and a split config has never been saved
  before (a one-shot guard distinguishes "never configured" from a deliberate "select nobody")
- `components/household/SplitConfigCard` renders the cost-split UI (which members split costs,
  even-vs-income-weighted mode) on `/profile` — this is where the split is configured for every
  tool, not inside the mortgage form itself
- `lib/calculations/household.ts`: `computeSplit(members, mode)` returns each member's 0-1 share
  of a cost — income-weighted mode (`'income'`) falls back to an even split if any included
  member's income isn't positive; `formatCompactIncome(amount)` formats for summary tiles (e.g.
  `$175k`)
- `TopNav` (global, rendered from `app/layout.tsx`) holds `NavMenu` (the tool picker: Dashboard /
  Mortgage / Budget-soon) and an always-visible `ProfileMenu` (circular avatar button) that shows
  a household summary and links to `/profile` — there is no separate "Profile" nav link,
  `ProfileMenu` is the entry point
- `NavMenu` owns the hamburger trigger, `open` state, and outside-click/Escape closing, then
  renders one of two controlled, presentation-only panels sharing `NAV_LINKS`/`NavLink` from
  `navLinks.ts`: `NavDropdown` (small anchored menu, `md:` breakpoint and up) or `NavDrawer`
  (full-height slide-in panel, below `md:`) — chosen via a `matchMedia('(min-width: 768px)')`
  hook (`useIsDesktop`), not CSS visibility classes, so only one panel is ever mounted (simpler
  to test, no duplicate DOM). `NavDrawer` still self-manages its own Escape/backdrop-click/body-
  scroll-lock (it predates `NavMenu` and has its own tests asserting that); `NavDropdown` has no
  listeners of its own and relies entirely on `NavMenu`
- `/profile` (`app/profile/page.tsx`) is the household member editor — add/edit/remove members,
  each with a name and income used for income-weighted splits

## Mortgage calculator (`app/tools/mortgage`)

- `types/mortgage.ts`: `AustralianState = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' |
'NT'`; `MortgageInputs.state` selects which state's stamp duty schedule applies
- `lib/calculations/mortgage.ts`: repayment formula (standard amortisation), amortisation
  schedule generation, purchase costs (legal fees, title registration, building inspection,
  mortgage registration) and LMI estimate — stamp duty itself is delegated to
  `lib/calculations/stampDuty/engine.ts` for the selected `state` (incl. first-home-buyer
  exemption/concession and foreign-buyer surcharge, both state-specific — see
  `stampDuty/data.ts`). `calculateMortgageResults(inputs, expenses, members, splitConfig)` uses
  `computeSplit` (see Household & navigation) against the household-level `splitConfig` to
  produce `results.splitBreakdown: { memberId, name, amount }[]` — empty unless 2+ members are
  selected in `splitConfig.memberIds`
- `lib/storage.ts`: saves inputs/expenses to `localStorage`; `encodeMortgageData` /
  `decodeMortgageData` pack non-default fields into a compact base64 URL string (short key names
  like `p`, `d`, `r`, `t`, `f`, `o`, `b`, `st` for state, `l`, `i`, `e`, `sp` for the split
  snapshot) for the "Share" feature — no server storage involved. The share link snapshots the
  split by **member name + computed amount**, not member ID, so a recipient sees the sender's
  frozen breakdown regardless of their own household; it's replaced by a live recalculation the
  moment the recipient edits any input
- Supports weekly/fortnightly/monthly repayment frequencies, offset account, a state selector
  driving stamp duty/FHB/surcharge rules, a household-aware cost split sourced from the
  household-level `splitConfig` (configured on `/profile`, not in this form — see Household &
  navigation), and a recurring expenses list (monthly/quarterly/annually)
- `app/tools/mortgage/page.tsx` composes `useMortgageCalculator()` (state/persistence/derived
  data, plus `members`/`displaySplitBreakdown` sourced from `useHousehold()`) with the form,
  results, chart, and `components/tools/mortgage/ShareModal.tsx` /
  `MortgageLoadingFallback.tsx` components — keep the page file itself limited to layout and
  wiring, not state logic

## Conventions

- Pure calculation logic lives in `lib/calculations/`, kept free of React/UI concerns
- Adding a new tool = new route in `app/tools/`, its own `lib/calculations/<tool>.ts`,
  `types/<tool>.ts`, and `components/tools/<tool>/` folder with a barrel `index.ts`
- Follow existing formatting (Prettier config) — run `npm run format` before committing
- Reuse `components/ui/` primitives instead of raw `<button>`/`<input>`/inline SVGs — that's what
  broke `Input`/`Select`'s auto-generated `id` (derived from the label text) when the same label
  was reused across list rows (`ExpenseItem`); pass an explicit `id` whenever a component can
  render more than once on a page
- Known pre-existing gap (not yet fixed): `useMortgageCalculator.ts`'s data-loading effect
  calls `setState` synchronously inside `useEffect`, which `eslint-plugin-react-hooks` flags
  (`react-hooks/set-state-in-effect`). `useDashboardData.ts` shows the workaround pattern this
  repo uses elsewhere — deferring the `setState` via `Promise.resolve().then(...)` — if you touch
  code the linter flags here, prefer that pattern over disabling the rule
- `lib/household/` (interface + swappable `localStorage`-backed implementation, single
  exported instance) is this repo's template for persistence layers — follow the same shape
  (`lib/<domain>/repository.ts` interface, `local*Repository.ts` implementation, barrel
  `index.ts` exporting a singleton) if a future tool needs its own persisted, swappable data
- superpowers plans/specs (`docs/superpowers/plans/`, `docs/superpowers/specs/`) are committed
  to git as the project's design-history record, not treated as scratch/ephemeral output —
  keep them checked in and excluded from Prettier (see Stack) rather than gitignoring them
- App icon: `app/icon.png` (favicon) and `app/apple-icon.png` (iOS home-screen icon) are
  picked up automatically via Next.js's file-based metadata convention — no manual `<link>`
  tags needed. `app/manifest.ts` + `public/icon-192.png` / `public/icon-512.png` cover the
  web app manifest (Android/PWA "Add to Home Screen"). Regenerate all four from the same
  source image if the icon ever changes.
