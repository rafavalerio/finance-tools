# Profile Menu, Dashboard Cleanup & Consistent Page Width — Design

## Context & goal

Since the household/profile layer shipped, two things feel off:

1. "Household" sits in the top nav as a plain link and as a dashboard tile, presented as if it
   were a tool alongside Mortgage/Budget. It's not a tool — it's a profile-level setting that
   should live somewhere more like an account menu.
2. Page width is inconsistent: the top nav and home page constrain to `max-w-7xl` (1280px), the
   profile page to `max-w-4xl` (896px), and the mortgage page to `max-w-[1600px]`. Navigating
   between pages visibly shifts the content width.

This round: relocate household management into a profile icon + dropdown in the nav, remove the
household tile from the dashboard, and unify every page onto one width via a shared component.

## Out of scope

- Any change to the household data model, `useHousehold()`, or the `/profile` page's own content
  (member list editor) — only *how you get there* changes, not the page itself.
- The budget tool (still just a placeholder).

## 1. Profile menu in TopNav

`components/layout/TopNav.tsx`:

- `NAV_LINKS` drops the "Profile" entry — inline links (and the mobile hamburger menu) become
  just **Mortgage** and **Budget (soon)**.
- A new icon-only button (a person/user icon) sits in the top-right corner, visible at every
  screen size — not folded into the mobile hamburger, since it's a separate "account" affordance
  rather than a tool-navigation link. Clicking it opens a dropdown; same click-outside/Escape-
  closing idiom already used twice in this codebase (`HeaderActions.tsx`, `TopNav`'s own mobile
  menu).
- Dropdown content:
  - **Household configured**: member count + combined income (e.g. "2 members · $175k/yr",
    reusing `formatCompactIncome` from `lib/calculations/household.ts`), member names, then a
    "Manage household →" link to `/profile`.
  - **Empty**: "Set up your household" CTA linking to `/profile` — same empty-state copy the
    dashboard tile used to show.
- A new `UserIcon` (lucide-react's `User`) is added to `components/ui/icons.tsx`, following the
  existing "map lucide icons to semantic names" convention.
- The new component lives at `components/layout/ProfileMenu.tsx`, rendered by `TopNav`.

`components/dashboard/HouseholdSummaryCard.tsx` (and its test) are **deleted**, not just
unrendered — its member-count/income-formatting logic moves into `ProfileMenu`; nothing keeps a
dead, unused card component around.

## 2. Dashboard shows tools only

`app/page.tsx`:

- Renders only `MortgageSnapshotCard` + `BudgetPlaceholderCard`. Grid changes from
  `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` to `grid-cols-1 md:grid-cols-2` (two cards, two
  columns).
- `useDashboardData()`'s public return shrinks to `{ mortgageResults }`. It still calls
  `useHousehold()` internally — the mortgage snapshot's `calculateMortgageResults()` call still
  needs `members` to compute correctly — but `members` is no longer exposed, since nothing
  outside the hook consumes it once the household tile is gone.

## 3. One page width everywhere, via a shared `PageContainer`

Today, `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` (or `max-w-4xl`, or `max-w-[1600px]`) is repeated
as a literal Tailwind class string in six places: `TopNav`, `app/page.tsx` (main + footer),
`app/profile/page.tsx` (header + main), and `app/tools/mortgage/page.tsx` (header + main) — three
different widths across those six copies.

New shared component, `components/layout/PageContainer.tsx`:

```tsx
interface PageContainerProps {
  children: React.ReactNode
  className?: string
}

export function PageContainer({ children, className = '' }: PageContainerProps) {
  return <div className={`max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
}
```

Every one of the six call sites replaces its own width-constrained inner `<div>` with
`<PageContainer className="...">`, keeping only the extra layout classes each site needs (e.g.
`TopNav`'s `h-16 flex items-center justify-between`, or each section's vertical padding like
`py-8`/`py-12`). The outer semantic elements (`<header>`, `<main>`, `<footer>`, `<nav>`) are
untouched — `PageContainer` only replaces the inner wrapper. Barrel-exported from
`components/layout/index.ts` alongside `TopNav`.

The whole site settles on **1600px** (matching the mortgage page's current width) as the single
standard. Any future page gets consistent width for free just by using `PageContainer`.

## Testing

Per this repo's existing convention, every new/changed file gets a test in the same pass:

- `components/layout/PageContainer.tsx` — renders children, applies the width/padding classes,
  merges an additional `className`.
- `components/layout/ProfileMenu.tsx` — empty state (CTA + link), configured state (member
  count/income text, singular/plural, name list, "Manage household" link), dropdown open/close
  via click-outside and Escape.
- `components/layout/TopNav.tsx` — update existing tests: "Profile" no longer appears as a nav
  link; the new profile icon button exists at every screen size.
- `app/page.tsx` — update existing tests: no household-related text/CTA appears; grid renders
  exactly two cards.
- `components/dashboard/useDashboardData.ts` — update existing tests to match the trimmed return
  shape (`{ mortgageResults }`, no `members`).
- Delete `components/dashboard/HouseholdSummaryCard.tsx` and `.test.tsx` entirely.
- `app/profile/page.tsx`, `app/tools/mortgage/page.tsx` — update to use `PageContainer`; existing
  tests should need no behavioral changes, just continue passing.
