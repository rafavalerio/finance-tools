# Finance Tools

Personal finance toolkit built with Next.js (App Router). Currently ships one tool — a mortgage
calculator for Victoria, Australia — with more tools planned as new routes under `app/tools/`.

## Stack

- Next.js 16 (App Router), React 19, TypeScript (strict)
- Tailwind CSS v4
- Recharts for charts
- lucide-react for icons
- No backend/database — everything is client-side (`'use client'`), state persisted to
  `localStorage` and optionally shareable via a base64-encoded URL param
- ESLint (`eslint-config-next`) + Prettier (`.prettierrc`: single quotes, no semicolons, trailing
  commas everywhere, printWidth 100, tabWidth 2)

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
- `lib/calculations/mortgage.test.ts`, `lib/storage.test.ts` — pure-function unit tests.
- `components/ui/*.test.tsx` — render + interaction tests for every shared primitive.
- `components/tools/mortgage/*.test.tsx` — interaction tests for form/list components.
- When adding a new tool or component, add its test file alongside it in the same pass — this
  repo's expectation is coverage for everything, not just the tricky bits.

## Structure

- `app/page.tsx` — home page listing available tools as cards
- `app/tools/<tool-name>/page.tsx` — one route per tool
- `components/tools/<tool-name>/` — tool-specific components; also where tool-specific hooks
  live (e.g. `useMortgageCalculator.ts`, which owns the mortgage page's state, persistence
  effects, and derived-data `useMemo`s, keeping `page.tsx` itself just layout/composition)
- `components/charts/` — Recharts wrappers (e.g. `AmortisationChart`, `ExpenseBreakdownChart`),
  plus `theme.ts` (shared chart colors and Recharts tooltip styling — don't hardcode `rgb(...)`
  chart colors in individual chart or page components, import from here instead)
- `components/ui/` — shared primitives (`Button`, `Card`, `Input`, `Select`, `Checkbox`,
  `Modal`), plus `icons.tsx` (re-exports `lucide-react` icons under semantic names, e.g.
  `Home as HouseIcon` — add new icons here rather than importing `lucide-react` directly in a
  page/component, so there's one place that maps "what it's for" to "which lucide icon"), each
  barrel-exported via the folder's `index.ts`
- `lib/calculations/<tool-name>.ts` — pure calculation functions, no React
- `lib/storage.ts` — localStorage persistence + compact URL encode/decode for shareable links
- `types/<tool-name>.ts` — shared TS types for a tool

## Mortgage calculator (`app/tools/mortgage`)

- `lib/calculations/mortgage.ts`: repayment formula (standard amortisation), amortisation
  schedule generation, Victorian stamp duty (incl. first-home-buyer exemption/concession and
  foreign-buyer 8% surcharge), LMI estimate, purchase costs (legal fees, title registration,
  building inspection, mortgage registration)
- `lib/storage.ts`: saves inputs/expenses to `localStorage`; `encodeMortgageData` /
  `decodeMortgageData` pack non-default fields into a compact base64 URL string (short key names
  like `p`, `d`, `r`, `t`, `f`, `o`, `b`, `l`, `i`, `e`) for the "Share" feature — no server
  storage involved
- Supports weekly/fortnightly/monthly repayment frequencies, offset account, per-person cost
  split, and a recurring expenses list (monthly/quarterly/annually)
- `app/tools/mortgage/page.tsx` composes `useMortgageCalculator()` (state/persistence/derived
  data) with the form, results, chart, and `components/tools/mortgage/ShareModal.tsx` /
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
  (`react-hooks/set-state-in-effect`)
- Known pre-existing gap (not yet fixed): `app/favicon.ico` is still the unmodified Next.js
  default — needs a project-specific icon before this reads as fully polished
