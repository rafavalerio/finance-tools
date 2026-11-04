# Mortgage-only App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the mortgage calculator the app's sole experience and remove budget, dashboard, household and repayment-splitting features.

**Architecture:** Render the existing mortgage calculator at `/`, remove the old tool route, and reduce the global header to a mortgage-focused brand link. Keep mortgage calculation, purchase-cost and input persistence code, while removing household-dependent results and split data from calculator and share-link interfaces.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest (existing tests only; do not add or run tests in this change).

**Spec:** `docs/superpowers/specs/2026-11-05-mortgage-only-design.md`

## Global Constraints

- Use `/` as the calculator route and update generated share links to match.
- Keep current mortgage calculation and purchase-cost behaviour; remove household splitting and budget-related code.
- Do not proactively erase old browser storage keys.
- Update or remove tests that cover deleted pages and behaviour. Do not add new dependencies.

## Review Focus

- Opening `/` must render the mortgage calculator with its existing defaults.
- Shared calculator links must point to `/` and preserve supported mortgage inputs.
- Existing mortgage inputs in local storage must still load and save under the current key.
- Reset must clear mortgage inputs and return the URL to `/`.
- Budget, household, split and old mortgage-tool routes must have no remaining navigation or imports.

---

### Task 1: Make the home route mortgage-only

**Files:**
- Modify: `app/page.tsx` (render the current mortgage page content)
- Delete: `app/tools/mortgage/page.tsx`
- Modify: `components/layout/TopNav.tsx`, `components/layout/navLinks.ts`
- Delete: `components/layout/NavMenu.tsx`, `components/layout/NavDropdown.tsx`, `components/layout/NavDrawer.tsx`, `components/layout/ProfileMenu.tsx`
- Modify: `app/layout.tsx`, `app/manifest.ts`, `README.md` (mortgage-focused metadata and product description)
- Rewrite: `CLAUDE.md` to document the remaining mortgage-only structure and conventions
- Delete: `app/profile/page.tsx`
- Update: `app/page.test.tsx`, `app/layout.test.tsx`, `components/layout/TopNav.test.tsx`
- Delete: `app/tools/mortgage/page.test.tsx`, `app/profile/page.test.tsx`, `components/layout/NavMenu.test.tsx`, `components/layout/NavDropdown.test.tsx`, `components/layout/NavDrawer.test.tsx`, `components/layout/ProfileMenu.test.tsx`

**Interfaces:**
- Consumes: existing exports from `components/tools/mortgage` and `components/charts`.
- Produces: `/` as the only calculator route; global header links directly to `/`.

- [ ] Move the existing mortgage page composition into `app/page.tsx`, preserving its form, purchase-cost card, results, amortisation chart, reset and share interactions.
- [ ] Remove `/tools/mortgage` and `/profile` page files and remove the now-unused navigation and profile components and exports.
- [ ] Change the header brand and app metadata to describe a mortgage-planning tool; keep the existing visual styling and icon.
- [ ] Update existing page, layout and navigation tests to assert the mortgage home and absence of removed destinations; do not add or run tests.

### Task 2: Remove budget and household subsystems

**Files:**
- Delete: `app/tools/budget/page.tsx`, `components/dashboard/`, `components/household/`, `components/tools/budget/`, `lib/budget/`, `lib/household/`, `lib/calculations/budget.ts`, `lib/calculations/household.ts`, `types/budget.ts`, `types/household.ts`
- Modify: `components/charts/index.ts`, `components/charts/theme.ts` (remove expense-chart exports and colours)
- Modify: `components/ui/icons.tsx`, `components/ui/index.ts` (remove icons used only by deleted features)
- Delete: `components/charts/ExpenseBreakdownChart.tsx`, `components/charts/ExpenseBreakdownChart.test.tsx`
- Update or delete: tests belonging to the removed budget, household and dashboard modules; update remaining old route fixtures

**Interfaces:**
- Consumes: no household or budget interfaces after Task 1.
- Produces: the mortgage feature and shared UI have no imports from deleted modules.

- [ ] Remove remaining budget and household exports and imports, including budget/household calculations and expense chart references.
- [ ] Delete tests that exclusively cover removed modules and remove obsolete route tests.
- [ ] Search source files for budget and household imports and remove any remaining dead references; do not add or run tests.

### Task 3: Remove repayment splitting from mortgage calculations and sharing

**Files:**
- Modify: `lib/calculations/mortgage.ts`, `types/mortgage.ts`
- Modify: `components/tools/mortgage/useMortgageCalculator.ts`, `components/tools/mortgage/ResultsSummary.tsx`
- Modify: `lib/storage.ts`
- Update: `lib/calculations/mortgage.test.ts`, `components/tools/mortgage/useMortgageCalculator.test.ts`, `components/tools/mortgage/ResultsSummary.test.ts`, storage tests

**Interfaces:**
- Produces: `calculateMortgageResults(inputs: MortgageInputs): MortgageResults` and `calculateSavedMortgageResults(inputs: MortgageInputs): MortgageResults | null` without member or split fields.
- Produces: `ResultsSummary` accepts only `results: MortgageResults | null`.
- Produces: share encoding and decoding handle mortgage inputs only; generated share URLs use `/?data=...`.

- [ ] Remove household arguments and repayment-split output from mortgage calculation functions and result types.
- [ ] Remove split display and snapshot state from the mortgage hook and results summary.
- [ ] Remove split-snapshot encoding and decoding from `lib/storage.ts`, update reset to `/`, and generate share URLs at `/?data=...`.
- [ ] Update existing mortgage and storage tests to remove split expectations and assert the root share URL; do not add or run tests.
- [ ] Review the final source search and diff for obsolete budget, household, split and `/tools/mortgage` references.
