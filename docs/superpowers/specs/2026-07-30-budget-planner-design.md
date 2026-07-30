# Budget Planner — Design

**Date:** 2026-07-30
**Status:** Approved

## Summary

Move recurring expenses and the monthly expense breakdown chart out of the mortgage calculator
and into a new budget planner tool at `/tools/budget`. The budget planner owns all expenses,
adds a category to each one, pulls the mortgage repayment in as a pinned read-only row, derives
monthly income from the household setup, and shows income / expenses / surplus plus a per-member
split of the total.

The mortgage calculator becomes loan-only: it keeps a repayment split so you can still see what
each person pays toward the loan, but it no longer knows about expenses.

## Motivation

Expenses were living in the mortgage tool for want of a better home. They aren't mortgage
concerns — they're budget concerns, and the mortgage tool's "total monthly outgoing" was an
incomplete picture of a household budget while also cluttering a loan calculator. Splitting them
apart gives each tool one job:

- **Mortgage** — what does this loan cost, and what does each person pay toward it?
- **Budget** — what does the whole month cost, what's left over, and what does each person pay
  of the total?

## Scope

**In scope:** expense list + category, expense breakdown chart, income derivation, surplus
summary, per-member split, dashboard card, one-time data migration, removal of expenses from the
mortgage tool.

**Out of scope:** a share link for the budget (the mortgage tool keeps its own), budgeting
targets/limits per category, historical tracking or month-over-month comparison, income tax
estimation.

## Architecture

### Type and module moves

`Expense`, `ExpenseFrequency`, and `ExpenseBreakdownItem` move out of `types/mortgage.ts` into a
new `types/budget.ts`:

```ts
export type ExpenseFrequency = 'monthly' | 'quarterly' | 'annually'

export type ExpenseCategory =
  | 'housing'
  | 'utilities'
  | 'insurance'
  | 'transport'
  | 'groceries'
  | 'health'
  | 'entertainment'
  | 'other'

export interface Expense {
  id: string
  name: string
  amount: number
  frequency: ExpenseFrequency
  category: ExpenseCategory
}

export interface BudgetData {
  expenses: Expense[]
  takeHomeOverride: number | null
}

export interface ExpenseBreakdownItem {
  name: string
  value: number
  color: string
}

export interface BudgetSummary {
  monthlyIncome: number
  monthlyExpenses: number
  surplus: number
}

export interface MemberBudgetShare {
  memberId: string
  name: string
  share: number // dollar amount of total monthly outgoing, not a ratio
  monthlyIncome: number
  leftover: number
}
```

`convertToMonthly` moves from `lib/calculations/mortgage.ts` to `lib/calculations/budget.ts`.

`formatCurrency` and `formatCurrencyPrecise` move from `lib/calculations/mortgage.ts` to a new
`lib/calculations/format.ts`. The charts and the budget tool should not be importing money
formatters from the mortgage module. This is a mechanical re-import across the six existing
call sites (`ResultsSummary`, `PurchaseCostsCard`, `useMortgageCalculator`,
`ExpenseBreakdownChart`, `AmortisationChart`, `MortgageSnapshotCard`).

`ExpenseList` and `ExpenseItem` move from `components/tools/mortgage/` to
`components/tools/budget/`, with their test files. `ExpenseBreakdownChart` stays in
`components/charts/` — that folder is already cross-tool — and re-points its imports at
`types/budget` and `lib/calculations/format`.

### Mortgage tool becomes loan-only

- `calculateMortgageResults(inputs, members, splitConfig)` — the `expenses` parameter is removed.
- `MortgageResults` drops `monthlyExpensesTotal` and `totalMonthlyOutgoing`.
- `MortgageResults.splitBreakdown` stays, now computed against `monthlyMortgagePayment` instead
  of the combined outgoing.
- `ResultsSummary` drops the "Monthly Expenses" and "Total Monthly Outgoing" rows; the split
  card header is reworded to "Repayment split" so it is clear what is being divided.
- `lib/storage.ts` stops saving and loading expenses (`MORTGAGE_EXPENSES` key handling is
  removed from `saveMortgageData`/`loadMortgageData`/`clearMortgageData`), and `encodeMortgageData`
  no longer emits the `e` field. `decodeMortgageData` continues to tolerate an `e` field on old
  share links — it is parsed and discarded, never surfaced — so existing links still open.
  `MortgageStorageData` and `DecodedMortgageData` lose their `expenses` field.
- `app/tools/mortgage/page.tsx` drops `ExpenseList` and `ExpenseBreakdownChart` from its layout;
  `useMortgageCalculator` drops `expenses`, `setExpenses`, and `expenseBreakdownData`.

### Budget persistence

New `lib/budget/`, following the `lib/household/` template the repo prescribes for persistence:

- `repository.ts` — `BudgetRepository` interface: `getExpenses()`, `saveExpenses(expenses)`,
  `getTakeHomeOverride()`, `saveTakeHomeOverride(value)`.
- `localBudgetRepository.ts` — the localStorage implementation. Two keys:
  `finance-tools-budget-expenses` and `finance-tools-budget-take-home`.
- `index.ts` — barrel exporting a `budgetRepository` singleton.

**One-time migration.** `getExpenses()` checks: if the budget expenses key is absent and the
legacy `finance-tools-mortgage-expenses` key is present, it parses the legacy rows, assigns each
`category: 'other'`, writes them under the budget key, removes the legacy key, and returns them.
Existing expenses therefore survive the move without user action. The migration is keyed on
absence of the budget key, so it can never re-run over data the user has since edited, and it
never runs for a user who had no legacy expenses.

### Budget calculations (`lib/calculations/budget.ts`)

Pure functions, no React:

- `convertToMonthly(amount, frequency)` — moved unchanged from the mortgage module.
- `computeMonthlyIncome(members, takeHomeOverride)` — returns `takeHomeOverride` when it is
  non-null, otherwise `sum(member.income) / 12`.
- `computeCategoryBreakdown(expenses, mortgageMonthly)` — returns `ExpenseBreakdownItem[]`: one
  entry per category that has a non-zero total, with expense amounts converted to monthly and
  summed, plus a `Mortgage` entry (chart accent colour) when `mortgageMonthly > 0`. Colours come
  from a fixed `CATEGORY_COLORS` map added to `components/charts/theme.ts`, keyed by
  `ExpenseCategory`, so a category keeps the same colour as rows are added and removed.
- `computeBudgetSummary(expenses, mortgageMonthly, members, takeHomeOverride)` — returns
  `BudgetSummary`. `monthlyExpenses` includes the mortgage row; `surplus = monthlyIncome -
  monthlyExpenses` and may be negative.
- `computeMemberBudgetShares(members, splitConfig, takeHomeOverride, totalMonthlyOutgoing)` —
  returns `MemberBudgetShare[]`. Ratios come from `computeSplit` in
  `lib/calculations/household.ts`, so even-vs-income mode behaves identically to the mortgage
  tool. Returns `[]` when fewer than 2 members are selected in `splitConfig.memberIds`.

  Per-member monthly income: when `takeHomeOverride` is null, each member's own
  `income / 12`. When an override is set, the household figure is apportioned across the
  included members in proportion to their gross incomes (a 60/40 earning pair splits the
  override 60/40); if the included members' gross incomes sum to zero, the override is split
  evenly. `leftover = monthlyIncome - share` and may be negative.

### Budget page (`app/tools/budget/page.tsx`)

`useBudgetPlanner()` in `components/tools/budget/` owns state, persistence effects, and derived
memos, mirroring `useMortgageCalculator`; `page.tsx` stays layout and wiring only. The hook:

- loads expenses and the take-home override via `budgetRepository`, and members/split config via
  `useHousehold()`
- reads the saved mortgage with `loadMortgageData()` and derives the monthly repayment via
  `calculateMortgageResults`. This is a one-way read — the mortgage tool has no knowledge of the
  budget.
- persists expenses and the override on change, guarded by an `isLoaded` flag
- follows the `useDashboardData` pattern of deferring the initial `setState` through
  `Promise.resolve().then(...)` to satisfy `react-hooks/set-state-in-effect`
- exposes `expenses`, `setExpenses`, `takeHomeOverride`, `setTakeHomeOverride`, `mortgageMonthly`,
  `summary`, `breakdownData`, `memberShares`, `isLoaded`

Layout is two-column on `lg:`, matching the mortgage tool, inside `PageContainer` with a
`ToolHeader` titled "Budget Planner":

- **Left:** `IncomeCard`, then `ExpenseList`.
- **Right:** `BudgetSummaryCard`, then `SplitBreakdownCard`, then `ExpenseBreakdownChart`.

`IncomeCard` shows the gross-derived monthly income from the household, plus an editable
"Monthly take-home" input that overrides it. Setting the field stores the override; a "reset to
gross" control clears it back to null. With no household members it prompts the user toward
`/profile`.

`ExpenseList` is renamed in the UI from "Additional Expenses" to "Expenses", with its
description updated to drop the mortgage framing. It gains:

- a category `Select` on each row (`ExpenseItem`), defaulting to `other` for new rows
- a pinned first row for the mortgage: label "Mortgage repayment", category Housing, amount =
  the monthly repayment, no editable fields and no remove button, with a link to
  `/tools/mortgage`. When no mortgage is saved, the pinned row is replaced by a "Set up your
  mortgage" prompt linking to the same place, rather than a `$0` row.

`BudgetSummaryCard` shows monthly income, total monthly expenses (mortgage included), and
surplus, with the surplus rendered in red when negative.

`SplitBreakdownCard` renders `memberShares`: per member, their name, their share of total
monthly outgoing, and their leftover underneath (red when negative). It renders nothing when
`memberShares` is empty.

Navigation: the `budget` entry in `components/layout/navLinks.ts` loses `disabled: true` and
points at `/tools/budget`.

### Dashboard

`useDashboardData` additionally loads budget data and returns a `BudgetSummary | null`.
`BudgetPlaceholderCard` is deleted and replaced by a `BudgetSnapshotCard` in
`components/dashboard/` (named to match the existing `MortgageSnapshotCard`, and to avoid
colliding with the budget tool's own `BudgetSummaryCard`) showing monthly surplus and the top
three expense categories by amount.
When nothing is saved it shows an empty state prompting the user to `/tools/budget`, in the same
shape as the current placeholder.

## Data flow

```
household (members, splitConfig)  ──┐
                                    ├──> useBudgetPlanner ──> summary / shares / breakdown
localStorage: budget expenses    ───┤
localStorage: take-home override ───┤
localStorage: mortgage inputs    ───┘   (read-only, via loadMortgageData)
```

The mortgage tool reads household data and its own storage only. The budget tool reads household
data, its own storage, and the mortgage's storage. There is no path from mortgage to budget.

## Error handling

- `localBudgetRepository` wraps every localStorage access in try/catch and returns a safe default
  (`[]` / `null`) on failure, matching `localStorageHouseholdRepository`.
- The migration path is inside the same try/catch; a malformed legacy value is discarded rather
  than crashing, and the legacy key is still removed so it cannot fail repeatedly.
- Absent or incomplete mortgage data yields `mortgageMonthly = 0` and the "Set up your mortgage"
  prompt, never a crash.
- Income-weighted split already falls back to even when any included member's income is not
  positive (existing `computeSplit` behaviour).
- Negative surplus and negative leftover are valid states, displayed in red, not errors.

## Testing

Per the repo's expectation of coverage for everything, in the same pass:

- `lib/calculations/budget.test.ts` — `convertToMonthly`, `computeMonthlyIncome` (with and
  without override), `computeCategoryBreakdown` (grouping, zero-amount exclusion, mortgage
  entry, stable colours), `computeBudgetSummary` (negative surplus), `computeMemberBudgetShares`
  (even mode, income mode, override apportioning, zero-gross fallback, negative leftover, fewer
  than 2 members).
- `lib/budget/localBudgetRepository.test.ts` — get/save round-trip against a mocked
  `localStorage`, plus the legacy-migration case: legacy key present + budget key absent imports
  and clears; budget key present leaves the legacy key untouched and does not import.
- `lib/calculations/mortgage.test.ts` — updated for the removed `expenses` parameter and the
  repayment-only split.
- `lib/storage.test.ts` — updated for expenses no longer being saved or encoded, plus a case
  asserting an old share link containing `e` still decodes without error.
- `components/tools/budget/ExpenseList.test.tsx` / `ExpenseItem.test.tsx` — moved, plus category
  selection and the pinned mortgage row (present, not removable, prompt when absent).
- `components/tools/budget/IncomeCard.test.tsx`, `BudgetSummaryCard.test.tsx`,
  `SplitBreakdownCard.test.tsx`, `useBudgetPlanner.test.ts`.
- `components/dashboard/useDashboardData.test.ts` updated; `BudgetSnapshotCard.test.tsx` added and
  `BudgetPlaceholderCard.test.tsx` removed.

## Documentation

`CLAUDE.md` and `README.md` are updated: a budget planner section, the mortgage section trimmed
of expenses, the new `types/budget.ts` / `lib/budget/` / `lib/calculations/budget.ts` /
`lib/calculations/format.ts` entries in the structure list, and the note that
`components/tools/budget/` follows the same shape as the mortgage tool folder.
