# Budget Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move recurring expenses and the expense breakdown chart out of the mortgage calculator into a new budget planner at `/tools/budget` that adds categories, pulls the mortgage repayment in as a pinned row, derives income from the household, and shows surplus plus a per-member split.

**Architecture:** Expenses become their own domain (`types/budget.ts`, `lib/calculations/budget.ts`, `lib/budget/` repository) consumed by a new tool folder `components/tools/budget/`. The budget reads the mortgage's saved data one-way; the mortgage tool knows nothing about the budget and keeps only a repayment-level household split.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, Recharts, Vitest + React Testing Library, localStorage persistence.

**Spec:** `docs/superpowers/specs/2026-07-30-budget-planner-design.md`

## Global Constraints

- All persisted data is client-side `localStorage`. No backend, no database, no network calls.
- Every component file that renders React and uses state/effects starts with `'use client'`.
- Repository methods are **async** (`Promise`-returning), matching `lib/household/localStorageRepository.ts`, even though localStorage is synchronous.
- Every localStorage access is wrapped in try/catch and returns a safe default on failure.
- New icons are added to `components/ui/icons.tsx` and re-exported from `components/ui/index.ts` — never import `lucide-react` directly in a page or component.
- Chart colours come from `components/charts/theme.ts`. Never hardcode `rgb(...)` in a chart or page component.
- `lib/calculations/` stays free of React and UI imports. Colours are passed *into* calculation functions as parameters, not imported from `components/`.
- Components that can render more than once on a page pass an explicit `id` to `Input`/`Select` (their auto-generated id is derived from the label text and collides otherwise).
- Prettier config: single quotes, **no semicolons**, trailing commas everywhere, printWidth 100, tabWidth 2. Run `npm run format` before each commit.
- Tests live next to the code they cover as `*.test.ts(x)`. Every new or moved file gets its test in the same task.
- localStorage keys: `finance-tools-budget-expenses`, `finance-tools-budget-take-home`. The legacy key `finance-tools-mortgage-expenses` is read once by the migration, then removed.
- Deferred `setState` in effects uses `Promise.resolve().then(...)` (the `useDashboardData` pattern), never an eslint-disable for `react-hooks/set-state-in-effect`.

## File Structure

**Created:**
- `lib/calculations/format.ts` — currency formatters, shared by every tool
- `types/budget.ts` — budget domain types
- `lib/calculations/budget.ts` — pure budget maths
- `lib/budget/repository.ts` / `localBudgetRepository.ts` / `index.ts` — persistence
- `components/tools/budget/IncomeCard.tsx` / `BudgetSummaryCard.tsx` / `SplitBreakdownCard.tsx` / `useBudgetPlanner.ts` / `index.ts`
- `app/tools/budget/page.tsx`
- `components/dashboard/BudgetSnapshotCard.tsx`

**Moved:**
- `components/tools/mortgage/ExpenseList.tsx` → `components/tools/budget/ExpenseList.tsx`
- `components/tools/mortgage/ExpenseItem.tsx` → `components/tools/budget/ExpenseItem.tsx`
- (both with their `.test.tsx` files)

**Deleted:**
- `components/dashboard/BudgetPlaceholderCard.tsx` (+ test)

**Modified:** `types/mortgage.ts`, `lib/calculations/mortgage.ts`, `lib/storage.ts`, `components/charts/theme.ts`, `components/charts/ExpenseBreakdownChart.tsx`, `components/charts/AmortisationChart.tsx`, `components/tools/mortgage/{ResultsSummary,PurchaseCostsCard,useMortgageCalculator,index}.ts(x)`, `app/tools/mortgage/page.tsx`, `components/dashboard/{MortgageSnapshotCard,useDashboardData,index}.ts(x)`, `components/layout/navLinks.ts`, `app/page.tsx`, `CLAUDE.md`, `README.md`.

**Task order rationale:** Task 1 unblocks shared formatters. Tasks 2–3 build the new domain with no consumers (safe, fully green). Task 4 is the pivot — it removes expenses from the mortgage tool *and* relocates the expense components in one commit, because the type removal cascades into them. Tasks 5–8 build up the budget UI bottom-up. Task 9 documents and verifies.

---

### Task 1: Extract shared currency formatters

`formatCurrency` and `formatCurrencyPrecise` live in `lib/calculations/mortgage.ts` today, but the charts, the dashboard, and (soon) the budget all import them. Move them to their own module so nothing outside the mortgage tool depends on the mortgage module for formatting.

**Files:**
- Create: `lib/calculations/format.ts`
- Create: `lib/calculations/format.test.ts`
- Modify: `lib/calculations/mortgage.ts` (remove both functions, lines ~222-247)
- Modify: `components/tools/mortgage/ResultsSummary.tsx`, `components/tools/mortgage/PurchaseCostsCard.tsx`, `components/tools/mortgage/useMortgageCalculator.ts`, `components/charts/ExpenseBreakdownChart.tsx`, `components/charts/AmortisationChart.tsx`, `components/dashboard/MortgageSnapshotCard.tsx` (re-point imports)

**Interfaces:**
- Consumes: nothing.
- Produces: `formatCurrency(amount: number): string`, `formatCurrencyPrecise(amount: number): string` from `@/lib/calculations/format`.

- [ ] **Step 1: Write the failing test**

Create `lib/calculations/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatCurrency, formatCurrencyPrecise } from './format'

describe('formatCurrency', () => {
  it('formats AUD with no decimal places', () => {
    expect(formatCurrency(1234.56)).toBe('$1,235')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0')
  })
})

describe('formatCurrencyPrecise', () => {
  it('formats AUD with two decimal places', () => {
    expect(formatCurrencyPrecise(1234.5)).toBe('$1,234.50')
  })

  it('formats negative amounts', () => {
    expect(formatCurrencyPrecise(-250)).toBe('-$250.00')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/calculations/format.test.ts`
Expected: FAIL — cannot find module `./format`.

- [ ] **Step 3: Create the module**

Create `lib/calculations/format.ts`:

```ts
/**
 * Format currency for display (AUD)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format currency with cents for precise amounts
 */
export function formatCurrencyPrecise(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/calculations/format.test.ts`
Expected: PASS (4 tests). If the negative-amount assertion fails, correct the expected string to whatever `Intl` produces on this Node version and keep the test — it documents real behaviour.

- [ ] **Step 5: Remove the originals from the mortgage module**

In `lib/calculations/mortgage.ts`, delete the `formatCurrency` and `formatCurrencyPrecise` function bodies (including their JSDoc comments). Leave `formatFrequencyLabel` in place.

- [ ] **Step 6: Re-point the six importers**

In each of these files, remove `formatCurrency` / `formatCurrencyPrecise` from the `@/lib/calculations/mortgage` import and add an import from `@/lib/calculations/format`:

- `components/tools/mortgage/ResultsSummary.tsx` — keeps `formatFrequencyLabel` from mortgage:
  ```ts
  import { formatFrequencyLabel } from '@/lib/calculations/mortgage'
  import { formatCurrency, formatCurrencyPrecise } from '@/lib/calculations/format'
  ```
- `components/tools/mortgage/PurchaseCostsCard.tsx`
- `components/tools/mortgage/useMortgageCalculator.ts`
- `components/charts/ExpenseBreakdownChart.tsx`
- `components/charts/AmortisationChart.tsx`
- `components/dashboard/MortgageSnapshotCard.tsx`

Check each file for what else it imports from `@/lib/calculations/mortgage` and keep those imports; delete the mortgage import line entirely only if nothing is left on it.

- [ ] **Step 7: Verify nothing still imports the formatters from mortgage**

Run: `grep -rn "formatCurrency" --include=*.ts --include=*.tsx app components lib | grep "calculations/mortgage"`
Expected: no output.

- [ ] **Step 8: Run the full suite and typecheck**

Run: `npm run test && npx tsc --noEmit && npm run lint`
Expected: all pass.

- [ ] **Step 9: Format and commit**

```bash
npm run format
git add -A
git commit -m "Extract currency formatters into lib/calculations/format"
```

---

### Task 2: Budget types and calculations

Pure domain layer with no consumers yet. Nothing in this task touches the mortgage tool, so the app stays green throughout.

Note: `convertToMonthly` is defined here while `lib/calculations/mortgage.ts` still has its own copy. That duplication is deliberate and temporary — Task 4 deletes the mortgage copy.

**Files:**
- Create: `types/budget.ts`
- Create: `lib/calculations/budget.ts`
- Create: `lib/calculations/budget.test.ts`
- Modify: `components/charts/theme.ts` (add `CATEGORY_COLORS`)

**Interfaces:**
- Consumes: `computeSplit(members, mode)` from `@/lib/calculations/household` (returns `Record<memberId, ratio>`); `HouseholdMember { id, name, income }` and `HouseholdSplitConfig { memberIds, mode }` from `@/types/household`.
- Produces, from `@/types/budget`: `ExpenseFrequency`, `ExpenseCategory`, `Expense`, `BudgetData`, `ExpenseBreakdownItem`, `BudgetSummary`, `MemberBudgetShare`.
  From `@/lib/calculations/budget`: `EXPENSE_CATEGORIES`, `convertToMonthly`, `computeMonthlyIncome`, `computeCategoryBreakdown`, `computeBudgetSummary`, `computeMemberBudgetShares`.
  From `@/components/charts/theme`: `CATEGORY_COLORS: Record<ExpenseCategory, string>`.

- [ ] **Step 1: Write the types**

Create `types/budget.ts`:

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
  /** Dollar amount of total monthly outgoing, not a ratio */
  share: number
  monthlyIncome: number
  leftover: number
}
```

- [ ] **Step 2: Add category colours to the chart theme**

Append to `components/charts/theme.ts`:

```ts
import { ExpenseCategory } from '@/types/budget'

/**
 * Fixed colour per expense category, so a category keeps the same slice colour
 * as expenses are added and removed.
 */
export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  housing: 'rgb(139, 195, 156)',
  utilities: 'rgb(147, 178, 212)',
  insurance: 'rgb(219, 182, 136)',
  transport: 'rgb(198, 146, 184)',
  groceries: 'rgb(168, 198, 184)',
  health: 'rgb(212, 163, 156)',
  entertainment: 'rgb(176, 176, 168)',
  other: 'rgb(150, 160, 175)',
}
```

- [ ] **Step 3: Write the failing test**

Create `lib/calculations/budget.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  convertToMonthly,
  computeMonthlyIncome,
  computeCategoryBreakdown,
  computeBudgetSummary,
  computeMemberBudgetShares,
  EXPENSE_CATEGORIES,
} from './budget'
import { Expense, ExpenseCategory } from '@/types/budget'
import { HouseholdMember, HouseholdSplitConfig } from '@/types/household'

const colors: Record<ExpenseCategory, string> = {
  housing: '#housing',
  utilities: '#utilities',
  insurance: '#insurance',
  transport: '#transport',
  groceries: '#groceries',
  health: '#health',
  entertainment: '#entertainment',
  other: '#other',
}
const MORTGAGE_COLOR = '#mortgage'

const expenses: Expense[] = [
  { id: '1', name: 'Rates', amount: 300, frequency: 'quarterly', category: 'housing' },
  { id: '2', name: 'Water', amount: 120, frequency: 'monthly', category: 'utilities' },
  { id: '3', name: 'Power', amount: 180, frequency: 'monthly', category: 'utilities' },
]

const members: HouseholdMember[] = [
  { id: 'a', name: 'Alex', income: 100000 },
  { id: 'b', name: 'Sam', income: 50000 },
]

const evenSplit: HouseholdSplitConfig = { memberIds: ['a', 'b'], mode: 'even' }
const incomeSplit: HouseholdSplitConfig = { memberIds: ['a', 'b'], mode: 'income' }

describe('convertToMonthly', () => {
  it('leaves monthly amounts unchanged', () => {
    expect(convertToMonthly(100, 'monthly')).toBe(100)
  })

  it('divides quarterly amounts by three', () => {
    expect(convertToMonthly(300, 'quarterly')).toBe(100)
  })

  it('divides annual amounts by twelve', () => {
    expect(convertToMonthly(1200, 'annually')).toBe(100)
  })
})

describe('EXPENSE_CATEGORIES', () => {
  it('has a label for every category', () => {
    expect(EXPENSE_CATEGORIES).toHaveLength(8)
    expect(EXPENSE_CATEGORIES.map((c) => c.value)).toContain('other')
    expect(EXPENSE_CATEGORIES.every((c) => c.label.length > 0)).toBe(true)
  })
})

describe('computeMonthlyIncome', () => {
  it('sums gross annual incomes and divides by twelve when there is no override', () => {
    expect(computeMonthlyIncome(members, null)).toBeCloseTo(150000 / 12)
  })

  it('returns the override when one is set', () => {
    expect(computeMonthlyIncome(members, 9000)).toBe(9000)
  })

  it('returns zero for an empty household with no override', () => {
    expect(computeMonthlyIncome([], null)).toBe(0)
  })

  it('honours an override of zero rather than falling back to gross', () => {
    expect(computeMonthlyIncome(members, 0)).toBe(0)
  })
})

describe('computeCategoryBreakdown', () => {
  it('groups expenses by category and sums their monthly amounts', () => {
    const result = computeCategoryBreakdown(expenses, 0, colors, MORTGAGE_COLOR)
    const utilities = result.find((item) => item.name === 'Utilities')
    expect(utilities!.value).toBeCloseTo(300)
    expect(utilities!.color).toBe('#utilities')
    const housing = result.find((item) => item.name === 'Housing')
    expect(housing!.value).toBeCloseTo(100)
  })

  it('prepends a mortgage entry when the repayment is positive', () => {
    const result = computeCategoryBreakdown(expenses, 2500, colors, MORTGAGE_COLOR)
    expect(result[0]).toEqual({ name: 'Mortgage', value: 2500, color: MORTGAGE_COLOR })
  })

  it('omits the mortgage entry when the repayment is zero', () => {
    const result = computeCategoryBreakdown(expenses, 0, colors, MORTGAGE_COLOR)
    expect(result.some((item) => item.name === 'Mortgage')).toBe(false)
  })

  it('omits categories with no positive amount and rows with no name', () => {
    const withBlanks: Expense[] = [
      ...expenses,
      { id: '4', name: '', amount: 500, frequency: 'monthly', category: 'health' },
      { id: '5', name: 'Gym', amount: 0, frequency: 'monthly', category: 'entertainment' },
    ]
    const result = computeCategoryBreakdown(withBlanks, 0, colors, MORTGAGE_COLOR)
    expect(result.map((item) => item.name).sort()).toEqual(['Housing', 'Utilities'])
  })

  it('returns an empty array when there is nothing to show', () => {
    expect(computeCategoryBreakdown([], 0, colors, MORTGAGE_COLOR)).toEqual([])
  })
})

describe('computeBudgetSummary', () => {
  it('includes the mortgage in total monthly expenses', () => {
    const summary = computeBudgetSummary(expenses, 2500, members, null)
    expect(summary.monthlyExpenses).toBeCloseTo(2500 + 100 + 120 + 180)
  })

  it('computes surplus as income minus expenses', () => {
    const summary = computeBudgetSummary(expenses, 2500, members, 9000)
    expect(summary.monthlyIncome).toBe(9000)
    expect(summary.surplus).toBeCloseTo(9000 - 2900)
  })

  it('returns a negative surplus when expenses exceed income', () => {
    const summary = computeBudgetSummary(expenses, 2500, members, 1000)
    expect(summary.surplus).toBeLessThan(0)
  })

  it('ignores expenses with no name or a non-positive amount', () => {
    const withBlanks: Expense[] = [
      ...expenses,
      { id: '4', name: '', amount: 500, frequency: 'monthly', category: 'health' },
    ]
    const summary = computeBudgetSummary(withBlanks, 0, members, null)
    expect(summary.monthlyExpenses).toBeCloseTo(400)
  })
})

describe('computeMemberBudgetShares', () => {
  it('returns an empty array when fewer than two members are selected', () => {
    expect(computeMemberBudgetShares(members, { memberIds: ['a'], mode: 'even' }, null, 3000)).toEqual([])
    expect(computeMemberBudgetShares(members, { memberIds: [], mode: 'even' }, null, 3000)).toEqual([])
  })

  it('splits the total evenly in even mode', () => {
    const shares = computeMemberBudgetShares(members, evenSplit, null, 3000)
    expect(shares).toHaveLength(2)
    expect(shares[0].share).toBeCloseTo(1500)
    expect(shares[1].share).toBeCloseTo(1500)
  })

  it('splits the total by income share in income mode', () => {
    const shares = computeMemberBudgetShares(members, incomeSplit, null, 3000)
    expect(shares.find((s) => s.memberId === 'a')!.share).toBeCloseTo(2000)
    expect(shares.find((s) => s.memberId === 'b')!.share).toBeCloseTo(1000)
  })

  it('uses each member own gross income over twelve when there is no override', () => {
    const shares = computeMemberBudgetShares(members, evenSplit, null, 3000)
    expect(shares.find((s) => s.memberId === 'a')!.monthlyIncome).toBeCloseTo(100000 / 12)
    expect(shares.find((s) => s.memberId === 'b')!.monthlyIncome).toBeCloseTo(50000 / 12)
  })

  it('apportions a take-home override in proportion to gross incomes', () => {
    const shares = computeMemberBudgetShares(members, evenSplit, 9000, 3000)
    expect(shares.find((s) => s.memberId === 'a')!.monthlyIncome).toBeCloseTo(6000)
    expect(shares.find((s) => s.memberId === 'b')!.monthlyIncome).toBeCloseTo(3000)
  })

  it('splits a take-home override evenly when gross incomes sum to zero', () => {
    const zeroIncome: HouseholdMember[] = [
      { id: 'a', name: 'Alex', income: 0 },
      { id: 'b', name: 'Sam', income: 0 },
    ]
    const shares = computeMemberBudgetShares(zeroIncome, evenSplit, 4000, 3000)
    expect(shares[0].monthlyIncome).toBeCloseTo(2000)
    expect(shares[1].monthlyIncome).toBeCloseTo(2000)
  })

  it('computes leftover as monthly income minus share, and allows it to go negative', () => {
    const shares = computeMemberBudgetShares(members, evenSplit, 2000, 6000)
    const alex = shares.find((s) => s.memberId === 'a')!
    expect(alex.leftover).toBeCloseTo(alex.monthlyIncome - alex.share)
    expect(alex.leftover).toBeLessThan(0)
  })

  it('ignores members that are not in the split config', () => {
    const three: HouseholdMember[] = [...members, { id: 'c', name: 'Jo', income: 70000 }]
    const shares = computeMemberBudgetShares(three, evenSplit, null, 3000)
    expect(shares.map((s) => s.memberId)).toEqual(['a', 'b'])
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run lib/calculations/budget.test.ts`
Expected: FAIL — cannot find module `./budget`.

- [ ] **Step 5: Write the implementation**

Create `lib/calculations/budget.ts`:

```ts
import {
  Expense,
  ExpenseCategory,
  ExpenseFrequency,
  ExpenseBreakdownItem,
  BudgetSummary,
  MemberBudgetShare,
} from '@/types/budget'
import { HouseholdMember, HouseholdSplitConfig } from '@/types/household'
import { computeSplit } from './household'

/**
 * Every expense category with its display label, in the order they appear in the
 * category picker.
 */
export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'housing', label: 'Housing' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'transport', label: 'Transport' },
  { value: 'groceries', label: 'Groceries' },
  { value: 'health', label: 'Health' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'other', label: 'Other' },
]

const CATEGORY_LABELS: Record<ExpenseCategory, string> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((category) => [category.value, category.label]),
) as Record<ExpenseCategory, string>

/**
 * Convert an expense amount to its monthly equivalent
 */
export function convertToMonthly(amount: number, frequency: ExpenseFrequency): number {
  switch (frequency) {
    case 'monthly':
      return amount
    case 'quarterly':
      return amount / 3
    case 'annually':
      return amount / 12
  }
}

/** Rows the user has actually filled in — blank or zero rows never count toward totals. */
function usableExpenses(expenses: Expense[]): Expense[] {
  return expenses.filter((expense) => expense.name && expense.amount > 0)
}

/**
 * Household monthly income: the take-home override when set, otherwise gross annual
 * income summed across every member and divided by twelve.
 */
export function computeMonthlyIncome(
  members: HouseholdMember[],
  takeHomeOverride: number | null,
): number {
  if (takeHomeOverride !== null) return takeHomeOverride
  return members.reduce((total, member) => total + member.income, 0) / 12
}

/**
 * One breakdown entry per category with a positive monthly total, preceded by a
 * Mortgage entry when there is a repayment to show. Colours are passed in rather than
 * imported so this module stays free of UI dependencies.
 */
export function computeCategoryBreakdown(
  expenses: Expense[],
  mortgageMonthly: number,
  categoryColors: Record<ExpenseCategory, string>,
  mortgageColor: string,
): ExpenseBreakdownItem[] {
  const items: ExpenseBreakdownItem[] = []

  if (mortgageMonthly > 0) {
    items.push({ name: 'Mortgage', value: mortgageMonthly, color: mortgageColor })
  }

  const totals = new Map<ExpenseCategory, number>()
  for (const expense of usableExpenses(expenses)) {
    const monthly = convertToMonthly(expense.amount, expense.frequency)
    totals.set(expense.category, (totals.get(expense.category) ?? 0) + monthly)
  }

  for (const { value: category } of EXPENSE_CATEGORIES) {
    const total = totals.get(category)
    if (total && total > 0) {
      items.push({
        name: CATEGORY_LABELS[category],
        value: total,
        color: categoryColors[category],
      })
    }
  }

  return items
}

/**
 * Monthly income, total monthly expenses (mortgage included), and what is left over.
 * A negative surplus is a valid result, not an error.
 */
export function computeBudgetSummary(
  expenses: Expense[],
  mortgageMonthly: number,
  members: HouseholdMember[],
  takeHomeOverride: number | null,
): BudgetSummary {
  const monthlyIncome = computeMonthlyIncome(members, takeHomeOverride)
  const monthlyExpenses = usableExpenses(expenses).reduce(
    (total, expense) => total + convertToMonthly(expense.amount, expense.frequency),
    mortgageMonthly,
  )

  return { monthlyIncome, monthlyExpenses, surplus: monthlyIncome - monthlyExpenses }
}

/**
 * What each household member pays of the total monthly outgoing, and what is left of
 * their own income afterwards. Empty unless 2+ members are selected in the split config.
 *
 * The take-home override is a single household figure, so it is apportioned across the
 * included members in proportion to their gross incomes (a 60/40 earning pair splits it
 * 60/40), falling back to an even split when the gross incomes sum to zero.
 */
export function computeMemberBudgetShares(
  members: HouseholdMember[],
  splitConfig: HouseholdSplitConfig,
  takeHomeOverride: number | null,
  totalMonthlyOutgoing: number,
): MemberBudgetShare[] {
  const included = members.filter((member) => splitConfig.memberIds.includes(member.id))
  if (included.length < 2) return []

  const ratios = computeSplit(included, splitConfig.mode)
  const totalGross = included.reduce((total, member) => total + member.income, 0)

  return included.map((member) => {
    const share = totalMonthlyOutgoing * ratios[member.id]
    const monthlyIncome =
      takeHomeOverride === null
        ? member.income / 12
        : totalGross > 0
          ? takeHomeOverride * (member.income / totalGross)
          : takeHomeOverride / included.length

    return {
      memberId: member.id,
      name: member.name,
      share,
      monthlyIncome,
      leftover: monthlyIncome - share,
    }
  })
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run lib/calculations/budget.test.ts`
Expected: PASS (all tests).

- [ ] **Step 7: Typecheck, lint, format, commit**

```bash
npx tsc --noEmit && npm run lint && npm run format
git add -A
git commit -m "Add budget types and calculations"
```

---

### Task 3: Budget persistence repository with legacy migration

Follows the `lib/household/` template exactly: interface, localStorage implementation, barrel exporting a singleton.

**Files:**
- Create: `lib/budget/repository.ts`
- Create: `lib/budget/localBudgetRepository.ts`
- Create: `lib/budget/localBudgetRepository.test.ts`
- Create: `lib/budget/index.ts`

**Interfaces:**
- Consumes: `Expense`, `ExpenseCategory` from `@/types/budget` (Task 2).
- Produces: `budgetRepository` singleton and the `BudgetRepository` type from `@/lib/budget`, with `getExpenses(): Promise<Expense[]>`, `saveExpenses(expenses: Expense[]): Promise<void>`, `getTakeHomeOverride(): Promise<number | null>`, `saveTakeHomeOverride(value: number | null): Promise<void>`.

- [ ] **Step 1: Write the failing test**

Create `lib/budget/localBudgetRepository.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { LocalBudgetRepository } from './localBudgetRepository'
import { Expense } from '@/types/budget'

const EXPENSES_KEY = 'finance-tools-budget-expenses'
const TAKE_HOME_KEY = 'finance-tools-budget-take-home'
const LEGACY_KEY = 'finance-tools-mortgage-expenses'

const expenses: Expense[] = [
  { id: '1', name: 'Rates', amount: 300, frequency: 'quarterly', category: 'housing' },
  { id: '2', name: 'Power', amount: 180, frequency: 'monthly', category: 'utilities' },
]

beforeEach(() => {
  localStorage.clear()
})

describe('LocalBudgetRepository expenses', () => {
  it('returns an empty array when nothing has been saved', async () => {
    const repo = new LocalBudgetRepository()
    expect(await repo.getExpenses()).toEqual([])
  })

  it('round-trips expenses through localStorage', async () => {
    const repo = new LocalBudgetRepository()
    await repo.saveExpenses(expenses)
    expect(await repo.getExpenses()).toEqual(expenses)
  })

  it('returns an empty array if the stored value is corrupt', async () => {
    localStorage.setItem(EXPENSES_KEY, 'not-json')
    const repo = new LocalBudgetRepository()
    expect(await repo.getExpenses()).toEqual([])
  })
})

describe('LocalBudgetRepository take-home override', () => {
  it('returns null when no override has been saved', async () => {
    const repo = new LocalBudgetRepository()
    expect(await repo.getTakeHomeOverride()).toBeNull()
  })

  it('round-trips an override through localStorage', async () => {
    const repo = new LocalBudgetRepository()
    await repo.saveTakeHomeOverride(9000)
    expect(await repo.getTakeHomeOverride()).toBe(9000)
  })

  it('round-trips an override of zero without treating it as unset', async () => {
    const repo = new LocalBudgetRepository()
    await repo.saveTakeHomeOverride(0)
    expect(await repo.getTakeHomeOverride()).toBe(0)
  })

  it('clears the override when null is saved', async () => {
    const repo = new LocalBudgetRepository()
    await repo.saveTakeHomeOverride(9000)
    await repo.saveTakeHomeOverride(null)
    expect(await repo.getTakeHomeOverride()).toBeNull()
    expect(localStorage.getItem(TAKE_HOME_KEY)).toBeNull()
  })

  it('returns null if the stored override is corrupt', async () => {
    localStorage.setItem(TAKE_HOME_KEY, 'not-json')
    const repo = new LocalBudgetRepository()
    expect(await repo.getTakeHomeOverride()).toBeNull()
  })
})

describe('LocalBudgetRepository legacy mortgage-expense migration', () => {
  const legacy = [
    { id: 'x', name: 'Rates', amount: 300, frequency: 'quarterly' },
    { id: 'y', name: 'Power', amount: 180, frequency: 'monthly' },
  ]

  it('imports legacy mortgage expenses as "other" and removes the legacy key', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(legacy))
    const repo = new LocalBudgetRepository()

    const result = await repo.getExpenses()
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ name: 'Rates', amount: 300, frequency: 'quarterly' })
    expect(result.every((expense) => expense.category === 'other')).toBe(true)

    expect(localStorage.getItem(LEGACY_KEY)).toBeNull()
    expect(JSON.parse(localStorage.getItem(EXPENSES_KEY)!)).toHaveLength(2)
  })

  it('does not migrate when budget expenses already exist', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(legacy))
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses))
    const repo = new LocalBudgetRepository()

    expect(await repo.getExpenses()).toEqual(expenses)
    expect(localStorage.getItem(LEGACY_KEY)).not.toBeNull()
  })

  it('does not re-migrate after the first call', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(legacy))
    const repo = new LocalBudgetRepository()

    await repo.getExpenses()
    await repo.saveExpenses([])
    expect(await repo.getExpenses()).toEqual([])
  })

  it('discards a corrupt legacy value and still removes the key', async () => {
    localStorage.setItem(LEGACY_KEY, 'not-json')
    const repo = new LocalBudgetRepository()

    expect(await repo.getExpenses()).toEqual([])
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull()
  })

  it('handles an empty legacy array without writing a budget key', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([]))
    const repo = new LocalBudgetRepository()

    expect(await repo.getExpenses()).toEqual([])
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/budget/localBudgetRepository.test.ts`
Expected: FAIL — cannot find module `./localBudgetRepository`.

- [ ] **Step 3: Write the interface**

Create `lib/budget/repository.ts`:

```ts
import { Expense } from '@/types/budget'

export interface BudgetRepository {
  getExpenses(): Promise<Expense[]>
  saveExpenses(expenses: Expense[]): Promise<void>
  getTakeHomeOverride(): Promise<number | null>
  saveTakeHomeOverride(value: number | null): Promise<void>
}
```

- [ ] **Step 4: Write the implementation**

Create `lib/budget/localBudgetRepository.ts`:

```ts
import { Expense } from '@/types/budget'
import { BudgetRepository } from './repository'

const EXPENSES_KEY = 'finance-tools-budget-expenses'
const TAKE_HOME_KEY = 'finance-tools-budget-take-home'
// Expenses used to live in the mortgage tool. Read once on first budget load, then removed.
const LEGACY_MORTGAGE_EXPENSES_KEY = 'finance-tools-mortgage-expenses'

export class LocalBudgetRepository implements BudgetRepository {
  async getExpenses(): Promise<Expense[]> {
    try {
      const json = localStorage.getItem(EXPENSES_KEY)
      if (json) return JSON.parse(json)
      return this.migrateLegacyExpenses()
    } catch (error) {
      console.error('Failed to load budget expenses from localStorage:', error)
      return []
    }
  }

  async saveExpenses(expenses: Expense[]): Promise<void> {
    try {
      localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses))
    } catch (error) {
      console.error('Failed to save budget expenses to localStorage:', error)
    }
  }

  async getTakeHomeOverride(): Promise<number | null> {
    try {
      const json = localStorage.getItem(TAKE_HOME_KEY)
      if (json === null) return null
      const parsed = JSON.parse(json)
      return typeof parsed === 'number' ? parsed : null
    } catch (error) {
      console.error('Failed to load take-home override from localStorage:', error)
      return null
    }
  }

  async saveTakeHomeOverride(value: number | null): Promise<void> {
    try {
      if (value === null) {
        localStorage.removeItem(TAKE_HOME_KEY)
      } else {
        localStorage.setItem(TAKE_HOME_KEY, JSON.stringify(value))
      }
    } catch (error) {
      console.error('Failed to save take-home override to localStorage:', error)
    }
  }

  /**
   * One-time import of expenses saved by the old mortgage tool. Only runs when no budget
   * expenses exist, so it can never overwrite data the user has since edited. The legacy
   * key is always removed — including when its contents are unusable — so a bad value
   * cannot make this run again on every load.
   */
  private migrateLegacyExpenses(): Expense[] {
    const legacyJson = localStorage.getItem(LEGACY_MORTGAGE_EXPENSES_KEY)
    if (legacyJson === null) return []

    let migrated: Expense[] = []
    try {
      const parsed = JSON.parse(legacyJson)
      if (Array.isArray(parsed)) {
        migrated = parsed.map((expense) => ({
          id: expense.id ?? crypto.randomUUID(),
          name: expense.name ?? '',
          amount: expense.amount ?? 0,
          frequency: expense.frequency ?? 'monthly',
          category: 'other' as const,
        }))
      }
    } catch (error) {
      console.error('Failed to migrate legacy mortgage expenses:', error)
    }

    localStorage.removeItem(LEGACY_MORTGAGE_EXPENSES_KEY)
    if (migrated.length > 0) {
      localStorage.setItem(EXPENSES_KEY, JSON.stringify(migrated))
    }
    return migrated
  }
}
```

- [ ] **Step 5: Write the barrel**

Create `lib/budget/index.ts`:

```ts
import { BudgetRepository } from './repository'
import { LocalBudgetRepository } from './localBudgetRepository'

export const budgetRepository: BudgetRepository = new LocalBudgetRepository()
export type { BudgetRepository }
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run lib/budget/localBudgetRepository.test.ts`
Expected: PASS (all tests).

- [ ] **Step 7: Typecheck, lint, format, commit**

```bash
npx tsc --noEmit && npm run lint && npm run format
git add -A
git commit -m "Add budget repository with legacy mortgage-expense migration"
```

---

### Task 4: Mortgage becomes loan-only, expense components relocate

The pivot commit. Removing `Expense` from `types/mortgage.ts` cascades into `ExpenseList`/`ExpenseItem`/`ExpenseBreakdownChart`, so the component relocation happens here rather than in a later task. After this task the mortgage tool is loan-only and the moved components exist under `components/tools/budget/` but are not yet rendered anywhere.

This task also extracts `calculateSavedMortgageResults`, a single helper for "turn saved mortgage inputs into results", so the mortgage page, the dashboard, and (in Task 6) the budget all produce the same repayment figure. Today `useMortgageCalculator` applies `purchaseCosts.effectiveDeposit` before calculating and `useDashboardData` does not, so they can disagree.

**Files:**
- Modify: `types/mortgage.ts` (remove `Expense`, `ExpenseFrequency`, `ExpenseBreakdownItem`, `monthlyExpensesTotal`, `totalMonthlyOutgoing`)
- Modify: `lib/calculations/mortgage.ts` (drop `expenses` param and `convertToMonthly`; add `calculateSavedMortgageResults`)
- Modify: `lib/calculations/mortgage.test.ts`
- Modify: `lib/storage.ts`, `lib/storage.test.ts`
- Modify: `components/tools/mortgage/ResultsSummary.tsx` + `.test.tsx`
- Modify: `components/tools/mortgage/useMortgageCalculator.ts`, `components/tools/mortgage/index.ts`
- Modify: `app/tools/mortgage/page.tsx`
- Modify: `components/charts/ExpenseBreakdownChart.tsx` + `.test.tsx`
- Modify: `components/dashboard/useDashboardData.ts`
- Move: `components/tools/mortgage/ExpenseList.tsx` → `components/tools/budget/ExpenseList.tsx` (+ test)
- Move: `components/tools/mortgage/ExpenseItem.tsx` → `components/tools/budget/ExpenseItem.tsx` (+ test)
- Create: `components/tools/budget/index.ts`

**Interfaces:**
- Consumes: `Expense`, `ExpenseCategory`, `ExpenseBreakdownItem` from `@/types/budget`; `EXPENSE_CATEGORIES` from `@/lib/calculations/budget` (Task 2).
- Produces: `calculateMortgageResults(inputs, members, splitConfig): MortgageResults` (3 params now); `calculateSavedMortgageResults(inputs: MortgageInputs, members: HouseholdMember[], splitConfig: HouseholdSplitConfig): MortgageResults | null`; `MortgageStorageData { inputs }` (no `expenses`); `ExpenseList` / `ExpenseItem` from `@/components/tools/budget`.

- [ ] **Step 1: Move the two expense components with git mv**

```bash
mkdir -p components/tools/budget
git mv components/tools/mortgage/ExpenseList.tsx components/tools/budget/ExpenseList.tsx
git mv components/tools/mortgage/ExpenseList.test.tsx components/tools/budget/ExpenseList.test.tsx
git mv components/tools/mortgage/ExpenseItem.tsx components/tools/budget/ExpenseItem.tsx
git mv components/tools/mortgage/ExpenseItem.test.tsx components/tools/budget/ExpenseItem.test.tsx
```

- [ ] **Step 2: Update the moved tests first (they define the new behaviour)**

Replace `components/tools/budget/ExpenseItem.test.tsx` with:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExpenseItem } from './ExpenseItem'
import { Expense } from '@/types/budget'

const expense: Expense = {
  id: '1',
  name: 'Rates',
  amount: 300,
  frequency: 'quarterly',
  category: 'housing',
}

describe('ExpenseItem', () => {
  it('renders the expense values', () => {
    render(<ExpenseItem expense={expense} onChange={() => {}} onRemove={() => {}} />)
    expect(screen.getByLabelText('Expense Name')).toHaveValue('Rates')
    expect(screen.getByLabelText('Amount')).toHaveValue(300)
    expect(screen.getByLabelText('Frequency')).toHaveValue('quarterly')
    expect(screen.getByLabelText('Category')).toHaveValue('housing')
  })

  it('emits the updated expense when the category changes', async () => {
    const onChange = vi.fn()
    render(<ExpenseItem expense={expense} onChange={onChange} onRemove={() => {}} />)
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'utilities')
    expect(onChange).toHaveBeenCalledWith({ ...expense, category: 'utilities' })
  })

  it('emits the updated expense when the name changes', async () => {
    const onChange = vi.fn()
    render(<ExpenseItem expense={expense} onChange={onChange} onRemove={() => {}} />)
    await userEvent.type(screen.getByLabelText('Expense Name'), '!')
    expect(onChange).toHaveBeenCalledWith({ ...expense, name: 'Rates!' })
  })

  it('calls onRemove when the remove button is clicked', async () => {
    const onRemove = vi.fn()
    render(<ExpenseItem expense={expense} onChange={() => {}} onRemove={onRemove} />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove expense' }))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })
})
```

Replace `components/tools/budget/ExpenseList.test.tsx` with:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExpenseList } from './ExpenseList'
import { Expense } from '@/types/budget'

const expenses: Expense[] = [
  { id: '1', name: 'Rates', amount: 300, frequency: 'quarterly', category: 'housing' },
  { id: '2', name: 'Insurance', amount: 1200, frequency: 'annually', category: 'insurance' },
]

describe('ExpenseList', () => {
  it('shows an empty state when there are no expenses', () => {
    render(<ExpenseList expenses={[]} onChange={() => {}} />)
    expect(screen.getByText('No expenses added yet.')).toBeInTheDocument()
  })

  it('renders one row per expense', () => {
    render(<ExpenseList expenses={expenses} onChange={() => {}} />)
    expect(screen.getAllByLabelText('Expense Name')).toHaveLength(2)
  })

  it('appends a new blank expense defaulting to the other category', async () => {
    const onChange = vi.fn()
    render(<ExpenseList expenses={[]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Add expense' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    const [newExpenses] = onChange.mock.calls[0]
    expect(newExpenses).toHaveLength(1)
    expect(newExpenses[0]).toMatchObject({
      name: '',
      amount: 0,
      frequency: 'monthly',
      category: 'other',
    })
  })

  it('removes an expense when its remove button is clicked', async () => {
    const onChange = vi.fn()
    render(<ExpenseList expenses={expenses} onChange={onChange} />)
    await userEvent.click(screen.getAllByRole('button', { name: 'Remove expense' })[0])
    expect(onChange).toHaveBeenCalledWith([expenses[1]])
  })
})
```

- [ ] **Step 3: Run the moved tests to verify they fail**

Run: `npx vitest run components/tools/budget`
Expected: FAIL — `Expense` has no `category`, and the empty-state copy does not match.

- [ ] **Step 4: Update ExpenseItem for the budget domain**

In `components/tools/budget/ExpenseItem.tsx`, change the import and add a category select. Replace the import line and add the field between Amount and Frequency:

```tsx
import { Input, Select, Button, TrashIcon } from '@/components/ui'
import { Expense, ExpenseFrequency, ExpenseCategory } from '@/types/budget'
import { EXPENSE_CATEGORIES } from '@/lib/calculations/budget'
```

Add above the return, next to `frequencyOptions`:

```tsx
const categoryOptions = EXPENSE_CATEGORIES.map((category) => ({
  value: category.value,
  label: category.label,
}))
```

And insert this block between the Amount `<div>` and the Frequency `<div>`:

```tsx
      <div className="w-full sm:w-40">
        <Select
          id={`expense-category-${expense.id}`}
          label="Category"
          options={categoryOptions}
          value={expense.category}
          onChange={(e) => handleChange('category', e.target.value as ExpenseCategory)}
        />
      </div>
```

Widen `handleChange`'s value type so the category assignment typechecks:

```tsx
  const handleChange = (field: keyof Expense, value: string | number) => {
```

(This signature is already correct — `ExpenseCategory` is a string union. No change needed if it already reads this way.)

- [ ] **Step 5: Update ExpenseList for the budget domain**

In `components/tools/budget/ExpenseList.tsx`:

- Change `import { Expense } from '@/types/mortgage'` to `import { Expense } from '@/types/budget'`
- Add `category: 'other',` to the `newExpense` object literal
- Change the card title from `Additional Expenses` to `Expenses`
- Change the description to `Add recurring expenses like council rates, utilities, insurance, and groceries.`
- Change the empty state first line to `No expenses added yet.`

- [ ] **Step 6: Create the budget barrel**

Create `components/tools/budget/index.ts`:

```ts
export { ExpenseItem } from './ExpenseItem'
export { ExpenseList } from './ExpenseList'
```

- [ ] **Step 7: Run the moved tests to verify they pass**

Run: `npx vitest run components/tools/budget`
Expected: PASS.

- [ ] **Step 8: Strip expenses out of the mortgage types**

In `types/mortgage.ts`:

- Delete `export type ExpenseFrequency = ...`
- Delete `export interface Expense { ... }`
- Delete `export interface ExpenseBreakdownItem { ... }`
- In `MortgageResults`, delete the `monthlyExpensesTotal` and `totalMonthlyOutgoing` fields, and change the `// Monthly equivalents` comment block so it reads:

```ts
  // Monthly equivalent of the repayment, and how it splits across the household
  monthlyMortgagePayment: number
  splitBreakdown: MemberSplitAmount[]
```

- [ ] **Step 9: Update the mortgage calculation module**

In `lib/calculations/mortgage.ts`:

- Remove `Expense` and `ExpenseFrequency` from the `@/types/mortgage` import
- Delete the `convertToMonthly` function entirely (the budget module owns it now)
- Change the `calculateMortgageResults` signature to drop `expenses`:

```ts
export function calculateMortgageResults(
  inputs: MortgageInputs,
  members: HouseholdMember[],
  splitConfig: HouseholdSplitConfig,
): MortgageResults {
```

- Delete the `monthlyExpensesTotal` and `totalMonthlyOutgoing` calculations, and split on the repayment instead:

```ts
  // Split the monthly repayment across the selected household members (empty if fewer than 2)
  const splitMembers = members.filter((member) => splitConfig.memberIds.includes(member.id))
  let splitBreakdown: MemberSplitAmount[] = []
  if (splitMembers.length >= 2) {
    const ratios = computeSplit(splitMembers, splitConfig.mode)
    splitBreakdown = splitMembers.map((member) => ({
      memberId: member.id,
      name: member.name,
      amount: monthlyMortgagePayment * ratios[member.id],
    }))
  }
```

- Remove `monthlyExpensesTotal` and `totalMonthlyOutgoing` from the returned object
- Append this helper at the end of the file:

```ts
/**
 * Turn saved mortgage inputs into results, or null when the inputs are not yet complete
 * enough to calculate. Applies the same effective-deposit adjustment the mortgage page
 * uses, so every consumer (mortgage page, dashboard, budget) shows the same repayment.
 */
export function calculateSavedMortgageResults(
  inputs: MortgageInputs,
  members: HouseholdMember[],
  splitConfig: HouseholdSplitConfig,
): MortgageResults | null {
  if (inputs.loanAmount <= 0 || inputs.interestRate <= 0 || inputs.loanTermYears <= 0) {
    return null
  }

  const purchaseCosts =
    inputs.deposit > 0
      ? calculatePurchaseCosts(
          inputs.loanAmount,
          inputs.deposit,
          inputs.state,
          inputs.buyerType,
          inputs.includeLegalFees,
          inputs.includeBuildingInspection,
        )
      : null

  return calculateMortgageResults(
    { ...inputs, deposit: purchaseCosts?.effectiveDeposit ?? inputs.deposit },
    members,
    splitConfig,
  )
}
```

- [ ] **Step 10: Update the mortgage calculation tests**

In `lib/calculations/mortgage.test.ts`:

- Remove the `Expense` import from `@/types/mortgage`
- Remove `convertToMonthly` from the imports and delete its `describe` block if one exists
- Add `calculateSavedMortgageResults` to the imports from `./mortgage`
- Change every `calculateMortgageResults(baseInputs, [], members, config)` call to `calculateMortgageResults(baseInputs, members, config)` (drop the second argument)
- Delete the `'sums monthly expenses onto the mortgage payment'` test entirely
- Change the split assertions from `results.totalMonthlyOutgoing` to `results.monthlyMortgagePayment`, e.g.:

```ts
    expect(results.splitBreakdown[0].amount).toBeCloseTo(results.monthlyMortgagePayment / 2)
    expect(results.splitBreakdown[1].amount).toBeCloseTo(results.monthlyMortgagePayment / 2)
```

and for income mode:

```ts
    expect(alex.amount).toBeCloseTo(results.monthlyMortgagePayment * (2 / 3))
    expect(sam.amount).toBeCloseTo(results.monthlyMortgagePayment * (1 / 3))
```

- Append a new describe block:

```ts
describe('calculateSavedMortgageResults', () => {
  const noSplitConfig = { memberIds: [], mode: 'even' as const }

  it('returns null when the loan amount is zero', () => {
    expect(
      calculateSavedMortgageResults({ ...baseInputs, loanAmount: 0 }, [], noSplitConfig),
    ).toBeNull()
  })

  it('returns null when the interest rate is zero', () => {
    expect(
      calculateSavedMortgageResults({ ...baseInputs, interestRate: 0 }, [], noSplitConfig),
    ).toBeNull()
  })

  it('returns results when the inputs are complete', () => {
    const results = calculateSavedMortgageResults(baseInputs, [], noSplitConfig)
    expect(results).not.toBeNull()
    expect(results!.monthlyMortgagePayment).toBeGreaterThan(0)
  })

  it('reduces the deposit by purchase costs, raising the repayment', () => {
    const withDeposit = { ...baseInputs, deposit: 100000 }
    const adjusted = calculateSavedMortgageResults(withDeposit, [], noSplitConfig)!
    const unadjusted = calculateMortgageResults(withDeposit, [], noSplitConfig)
    expect(adjusted.monthlyMortgagePayment).toBeGreaterThan(unadjusted.monthlyMortgagePayment)
  })
})
```

If `baseInputs` in the existing file has `deposit: 0`, the last test still works because it overrides the deposit locally.

- [ ] **Step 11: Run the mortgage calculation tests**

Run: `npx vitest run lib/calculations/mortgage.test.ts`
Expected: PASS.

- [ ] **Step 12: Strip expenses out of storage**

In `lib/storage.ts`:

- Remove `Expense` and `ExpenseFrequency` from the `@/types/mortgage` import
- Remove `MORTGAGE_EXPENSES` from `STORAGE_KEYS` — but keep the literal string in a comment noting the budget repository now owns and migrates it:

```ts
const STORAGE_KEYS = {
  MORTGAGE_INPUTS: 'finance-tools-mortgage-inputs',
  // Expenses moved to the budget planner. `finance-tools-mortgage-expenses` is now read
  // (and cleared) once by lib/budget's migration — never written here again.
} as const
```

- Change `MortgageStorageData` to `{ inputs: MortgageInputs }`
- Change `DecodedMortgageData` to `extends MortgageStorageData { splitSnapshot: SplitSnapshotEntry[] | null }`
- Delete `EXP_FREQ_MAP` and `REVERSE_EXP_FREQ_MAP`
- Remove `CompactExpense` from the `CompactData` union and delete the `e?: CompactExpense[]` field and the `CompactExpense` interface — but keep decode tolerant by typing the index signature loosely enough that an old `e` field parses. Use:

```ts
interface CompactData {
  [key: string]: string | number | boolean | CompactSplitEntry[] | unknown[] | undefined
  sp?: CompactSplitEntry[] // split snapshot (name + amount, frozen at share time)
}
```

- In `saveMortgageData` / `loadMortgageData` / `clearMortgageData`, remove every reference to the expenses key; `loadMortgageData` returns `{ inputs: { ...DEFAULTS, ...parsedInputs } }`
- In `encodeMortgageData`, delete the `validExpenses` block
- In `decodeMortgageData`, keep the `if (shortKey === 'e' || shortKey === 'sp') continue` guard exactly as-is (this is what makes old share links safe), delete the expense-reconstruction block, and return `{ inputs, splitSnapshot }`

- [ ] **Step 13: Update the storage tests**

In `lib/storage.test.ts`:

- Remove the `expenses` array from the fixture object and from every `saveMortgageData` / `encodeMortgageData` call — they now take `{ inputs }` only
- Delete the tests named `'omits expenses with no name or non-positive amount'` and any assertion on `decoded!.expenses`
- Change `'round-trips inputs and expenses through localStorage'` to `'round-trips inputs through localStorage'` and assert on `inputs` only
- Change `'defaults expenses to an empty array if none were saved'` to assert `loadMortgageData()` equals `{ inputs: defaultInputs }`
- Change `'removes saved inputs and expenses'` to `'removes saved inputs'`
- Add a test proving old share links still decode:

```ts
  it('ignores the legacy expenses field on an old share link', () => {
    const legacy = btoa(JSON.stringify({ p: 600000, e: [{ n: 'Rates', a: 300, f: 'q' }] }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    const decoded = decodeMortgageData(legacy)
    expect(decoded).not.toBeNull()
    expect(decoded!.inputs.loanAmount).toBe(600000)
    expect(decoded).not.toHaveProperty('expenses')
  })
```

- [ ] **Step 14: Run the storage tests**

Run: `npx vitest run lib/storage.test.ts`
Expected: PASS.

- [ ] **Step 15: Update ResultsSummary**

In `components/tools/mortgage/ResultsSummary.tsx`, delete the entire `{/* Total Monthly Outgoings */}` block (the `<div>` containing the "Monthly Outgoings" heading and its three StatCards), and change the split section heading from `Split` to `Repayment split`:

```tsx
              <h4 className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
                Repayment split
              </h4>
```

In `components/tools/mortgage/ResultsSummary.test.tsx`, remove `monthlyExpensesTotal` and `totalMonthlyOutgoing` from the results fixture, and add:

```tsx
  it('no longer shows a combined monthly outgoing figure', () => {
    render(<ResultsSummary results={results} splitBreakdown={[]} />)
    expect(screen.queryByText('Total Monthly')).not.toBeInTheDocument()
    expect(screen.queryByText('Other Expenses')).not.toBeInTheDocument()
  })

  it('labels the split as a repayment split', () => {
    render(
      <ResultsSummary
        results={results}
        splitBreakdown={[
          { name: 'Alex', amount: 1200 },
          { name: 'Sam', amount: 1200 },
        ]}
      />,
    )
    expect(screen.getByText('Repayment split')).toBeInTheDocument()
  })
```

Adjust the fixture and imports to match whatever the existing test file already sets up.

- [ ] **Step 16: Update the mortgage hook**

In `components/tools/mortgage/useMortgageCalculator.ts`:

- Remove `Expense` and `ExpenseBreakdownItem` from the `@/types/mortgage` import
- Remove `convertToMonthly` from the `@/lib/calculations/mortgage` import and add `calculateSavedMortgageResults`
- Remove the `CHART_ACCENT_COLOR, CHART_PALETTE` import from `@/components/charts/theme`
- Delete the `expenses` state, `setExpenses` callback, and every reference to expenses in the load effect, save effect, reset handler, share handler, and return object
- Replace the `results` memo with:

```ts
  const results = useMemo(
    () => calculateSavedMortgageResults(inputs, members, splitConfig),
    [inputs, members, splitConfig],
  )
```

  and delete the now-unused `purchaseCosts` dependency from it (keep the `purchaseCosts` memo itself — `PurchaseCostsCard` still renders it)
- Delete the `expenseBreakdownData` memo entirely
- `saveMortgageData({ inputs })` and `generateShareUrl({ inputs }, snapshot)` lose their expenses field
- Remove `expenses`, `setExpenses`, and `expenseBreakdownData` from the returned object

- [ ] **Step 17: Update the mortgage barrel and page**

In `components/tools/mortgage/index.ts`, delete the `ExpenseItem` and `ExpenseList` exports.

In `app/tools/mortgage/page.tsx`:
- Remove `ExpenseList` from the `@/components/tools/mortgage` import
- Change the charts import to `import { AmortisationChart } from '@/components/charts'`
- Remove `expenses`, `setExpenses`, `expenseBreakdownData` from the destructured hook result
- Delete the `<ExpenseList ... />` element and the `<ExpenseBreakdownChart ... />` element

- [ ] **Step 18: Re-point the breakdown chart at the budget types**

In `components/charts/ExpenseBreakdownChart.tsx`, change `import { ExpenseBreakdownItem } from '@/types/mortgage'` to `from '@/types/budget'`. Leave everything else, including the "Monthly Expense Breakdown" title.

Change its empty-state copy from `Enter your loan details to see the expense breakdown.` to `Add expenses to see the breakdown.` and update the matching assertion in `components/charts/ExpenseBreakdownChart.test.tsx`, plus that file's `@/types/mortgage` import if it has one.

- [ ] **Step 19: Update the dashboard hook to use the shared helper**

In `components/dashboard/useDashboardData.ts`, replace the body of the `Promise.resolve().then(...)` block with:

```ts
      const saved = loadMortgageData()
      setMortgageResults(
        saved ? calculateSavedMortgageResults(saved.inputs, members, splitConfig) : null,
      )
```

and change the import from `calculateMortgageResults` to `calculateSavedMortgageResults`.

In `components/dashboard/useDashboardData.test.ts`, delete the two `localStorage.setItem('finance-tools-mortgage-expenses', ...)` lines — they are no longer read by this path.

- [ ] **Step 20: Verify nothing references the removed exports**

Run:
```bash
grep -rn "monthlyExpensesTotal\|totalMonthlyOutgoing\|from '@/types/mortgage'" --include=*.ts --include=*.tsx app components lib | grep -i expense
```
Expected: no output.

Run: `grep -rn "convertToMonthly" --include=*.ts --include=*.tsx app components lib | grep "calculations/mortgage"`
Expected: no output.

- [ ] **Step 21: Run everything**

Run: `npm run test && npx tsc --noEmit && npm run lint && npm run build`
Expected: all pass. Fix any straggling imports the compiler reports.

- [ ] **Step 22: Format and commit**

```bash
npm run format
git add -A
git commit -m "Make mortgage tool loan-only and relocate expense components to budget"
```

---

### Task 5: Budget UI components

Three presentational cards, driven entirely by props. No data loading here — that is Task 6.

**Files:**
- Create: `components/tools/budget/IncomeCard.tsx` + `.test.tsx`
- Create: `components/tools/budget/BudgetSummaryCard.tsx` + `.test.tsx`
- Create: `components/tools/budget/SplitBreakdownCard.tsx` + `.test.tsx`
- Modify: `components/tools/budget/ExpenseList.tsx` + `.test.tsx` (pinned mortgage row)
- Modify: `components/tools/budget/index.ts`
- Modify: `components/ui/icons.tsx`, `components/ui/index.ts` (add `UsersIcon`)

**Interfaces:**
- Consumes: `BudgetSummary`, `MemberBudgetShare`, `Expense` from `@/types/budget`; `formatCurrencyPrecise` from `@/lib/calculations/format`.
- Produces:
  - `IncomeCard({ grossMonthlyIncome, takeHomeOverride, onTakeHomeChange, hasMembers })` where `onTakeHomeChange: (value: number | null) => void`
  - `BudgetSummaryCard({ summary })` where `summary: BudgetSummary`
  - `SplitBreakdownCard({ shares })` where `shares: MemberBudgetShare[]`
  - `ExpenseList({ expenses, onChange, mortgageMonthly })` where `mortgageMonthly: number`

- [ ] **Step 1: Add the users icon**

In `components/ui/icons.tsx`, add `Users as UsersIcon,` to the export list. In `components/ui/index.ts`, add `UsersIcon,` to the icons re-export list.

- [ ] **Step 2: Write the failing IncomeCard test**

Create `components/tools/budget/IncomeCard.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IncomeCard } from './IncomeCard'

describe('IncomeCard', () => {
  it('shows the gross monthly income derived from the household', () => {
    render(
      <IncomeCard
        grossMonthlyIncome={12500}
        takeHomeOverride={null}
        onTakeHomeChange={() => {}}
        hasMembers
      />,
    )
    expect(screen.getByText('$12,500.00')).toBeInTheDocument()
    expect(screen.getByText(/before tax/i)).toBeInTheDocument()
  })

  it('prompts for household setup when there are no members', () => {
    render(
      <IncomeCard
        grossMonthlyIncome={0}
        takeHomeOverride={null}
        onTakeHomeChange={() => {}}
        hasMembers={false}
      />,
    )
    expect(screen.getByRole('link', { name: /household/i })).toHaveAttribute('href', '/profile')
  })

  it('emits a number when a take-home amount is entered', async () => {
    const onTakeHomeChange = vi.fn()
    render(
      <IncomeCard
        grossMonthlyIncome={12500}
        takeHomeOverride={null}
        onTakeHomeChange={onTakeHomeChange}
        hasMembers
      />,
    )
    await userEvent.type(screen.getByLabelText('Monthly take-home'), '9')
    expect(onTakeHomeChange).toHaveBeenCalledWith(9)
  })

  it('emits null when the take-home field is cleared', async () => {
    const onTakeHomeChange = vi.fn()
    render(
      <IncomeCard
        grossMonthlyIncome={12500}
        takeHomeOverride={9000}
        onTakeHomeChange={onTakeHomeChange}
        hasMembers
      />,
    )
    await userEvent.clear(screen.getByLabelText('Monthly take-home'))
    expect(onTakeHomeChange).toHaveBeenCalledWith(null)
  })

  it('offers a reset control only while an override is set', async () => {
    const onTakeHomeChange = vi.fn()
    const { rerender } = render(
      <IncomeCard
        grossMonthlyIncome={12500}
        takeHomeOverride={null}
        onTakeHomeChange={onTakeHomeChange}
        hasMembers
      />,
    )
    expect(screen.queryByRole('button', { name: /use gross/i })).not.toBeInTheDocument()

    rerender(
      <IncomeCard
        grossMonthlyIncome={12500}
        takeHomeOverride={9000}
        onTakeHomeChange={onTakeHomeChange}
        hasMembers
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /use gross/i }))
    expect(onTakeHomeChange).toHaveBeenCalledWith(null)
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run components/tools/budget/IncomeCard.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 4: Write IncomeCard**

Create `components/tools/budget/IncomeCard.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { Button, Card, CardHeader, CardTitle, CardContent, Input, WalletIcon } from '@/components/ui'
import { formatCurrencyPrecise } from '@/lib/calculations/format'

interface IncomeCardProps {
  grossMonthlyIncome: number
  takeHomeOverride: number | null
  onTakeHomeChange: (value: number | null) => void
  hasMembers: boolean
}

export function IncomeCard({
  grossMonthlyIncome,
  takeHomeOverride,
  onTakeHomeChange,
  hasMembers,
}: IncomeCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WalletIcon width="20" height="20" className="text-accent" />
          Income
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasMembers ? (
          <div className="text-center py-8 text-muted">
            <p>No household members yet.</p>
            <Link href="/profile" className="text-accent hover:underline text-sm mt-1 inline-block">
              Set up your household
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-background">
              <p className="text-xs text-muted mb-1">Gross monthly income</p>
              <p className="text-lg font-bold text-foreground">
                {formatCurrencyPrecise(grossMonthlyIncome)}
              </p>
              <p className="text-xs text-muted mt-1">
                Household income before tax, from your profile.
              </p>
            </div>

            <div className="flex items-end gap-3">
              <Input
                id="budget-take-home"
                label="Monthly take-home"
                type="number"
                prefix="$"
                placeholder="Optional"
                value={takeHomeOverride ?? ''}
                onChange={(e) => {
                  const parsed = parseFloat(e.target.value)
                  onTakeHomeChange(e.target.value === '' || isNaN(parsed) ? null : parsed)
                }}
              />
              {takeHomeOverride !== null && (
                <Button variant="ghost" size="md" onClick={() => onTakeHomeChange(null)}>
                  Use gross
                </Button>
              )}
            </div>
            <p className="text-xs text-muted">
              Set this to budget against what actually lands in your account.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npx vitest run components/tools/budget/IncomeCard.test.tsx`
Expected: PASS.

- [ ] **Step 6: Write the failing BudgetSummaryCard test**

Create `components/tools/budget/BudgetSummaryCard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BudgetSummaryCard } from './BudgetSummaryCard'

describe('BudgetSummaryCard', () => {
  it('shows income, expenses, and surplus', () => {
    render(
      <BudgetSummaryCard summary={{ monthlyIncome: 9000, monthlyExpenses: 6500, surplus: 2500 }} />,
    )
    expect(screen.getByText('$9,000.00')).toBeInTheDocument()
    expect(screen.getByText('$6,500.00')).toBeInTheDocument()
    expect(screen.getByText('$2,500.00')).toBeInTheDocument()
    expect(screen.getByText('Left over')).toBeInTheDocument()
  })

  it('labels and styles a negative surplus as a shortfall', () => {
    render(
      <BudgetSummaryCard summary={{ monthlyIncome: 5000, monthlyExpenses: 6500, surplus: -1500 }} />,
    )
    expect(screen.getByText('Shortfall')).toBeInTheDocument()
    expect(screen.getByTestId('budget-surplus')).toHaveClass('text-red-400')
  })
})
```

- [ ] **Step 7: Run it to verify it fails, then write BudgetSummaryCard**

Run: `npx vitest run components/tools/budget/BudgetSummaryCard.test.tsx` → FAIL.

Create `components/tools/budget/BudgetSummaryCard.tsx`:

```tsx
'use client'

import { Card, CardHeader, CardTitle, CardContent, ChartBarIcon } from '@/components/ui'
import { BudgetSummary } from '@/types/budget'
import { formatCurrencyPrecise } from '@/lib/calculations/format'

interface BudgetSummaryCardProps {
  summary: BudgetSummary
}

export function BudgetSummaryCard({ summary }: BudgetSummaryCardProps) {
  const isShortfall = summary.surplus < 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartBarIcon width="20" height="20" className="text-accent" />
          Monthly Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="p-3 rounded-lg bg-background min-w-0">
            <p className="text-xs text-muted mb-1">Income</p>
            <p className="text-lg font-bold text-foreground truncate">
              {formatCurrencyPrecise(summary.monthlyIncome)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-background min-w-0">
            <p className="text-xs text-muted mb-1">Expenses</p>
            <p className="text-lg font-bold text-foreground truncate">
              {formatCurrencyPrecise(summary.monthlyExpenses)}
            </p>
          </div>
          <div
            className={`p-3 rounded-lg min-w-0 border ${
              isShortfall ? 'bg-red-400/10 border-red-400/30' : 'bg-accent/10 border-accent/30'
            }`}
          >
            <p className="text-xs text-muted mb-1">{isShortfall ? 'Shortfall' : 'Left over'}</p>
            <p
              data-testid="budget-surplus"
              className={`text-lg font-bold truncate ${isShortfall ? 'text-red-400' : 'text-accent'}`}
            >
              {formatCurrencyPrecise(summary.surplus)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

Run: `npx vitest run components/tools/budget/BudgetSummaryCard.test.tsx` → PASS.

- [ ] **Step 8: Write the failing SplitBreakdownCard test**

Create `components/tools/budget/SplitBreakdownCard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SplitBreakdownCard } from './SplitBreakdownCard'
import { MemberBudgetShare } from '@/types/budget'

const shares: MemberBudgetShare[] = [
  { memberId: 'a', name: 'Alex', share: 3000, monthlyIncome: 6000, leftover: 3000 },
  { memberId: 'b', name: 'Sam', share: 3000, monthlyIncome: 2500, leftover: -500 },
]

describe('SplitBreakdownCard', () => {
  it('renders nothing when there are no shares', () => {
    const { container } = render(<SplitBreakdownCard shares={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows each member share and leftover', () => {
    render(<SplitBreakdownCard shares={shares} />)
    expect(screen.getByText('Alex')).toBeInTheDocument()
    expect(screen.getByText('Sam')).toBeInTheDocument()
    expect(screen.getAllByText('$3,000.00')).toHaveLength(3)
    expect(screen.getByText(/\$3,000\.00 left/)).toBeInTheDocument()
  })

  it('marks a negative leftover as short', () => {
    render(<SplitBreakdownCard shares={shares} />)
    const sam = screen.getByTestId('member-leftover-b')
    expect(sam).toHaveTextContent('short')
    expect(sam).toHaveClass('text-red-400')
  })
})
```

- [ ] **Step 9: Run it to verify it fails, then write SplitBreakdownCard**

Run: `npx vitest run components/tools/budget/SplitBreakdownCard.test.tsx` → FAIL.

Create `components/tools/budget/SplitBreakdownCard.tsx`:

```tsx
'use client'

import { Card, CardHeader, CardTitle, CardContent, UsersIcon } from '@/components/ui'
import { MemberBudgetShare } from '@/types/budget'
import { formatCurrencyPrecise } from '@/lib/calculations/format'

interface SplitBreakdownCardProps {
  shares: MemberBudgetShare[]
}

export function SplitBreakdownCard({ shares }: SplitBreakdownCardProps) {
  if (shares.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersIcon width="20" height="20" className="text-accent" />
          Who Pays What
        </CardTitle>
        <p className="text-sm text-muted mt-1">
          Each person&rsquo;s share of the total monthly outgoing, and what is left of their income.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {shares.map((member) => {
            const isShort = member.leftover < 0
            return (
              <div
                key={member.memberId}
                className="p-3 rounded-lg bg-accent/10 border border-accent/30 min-w-0"
              >
                <p className="text-xs text-muted mb-1 truncate">{member.name}</p>
                <p className="text-lg font-bold text-accent truncate">
                  {formatCurrencyPrecise(member.share)}
                </p>
                <p
                  data-testid={`member-leftover-${member.memberId}`}
                  className={`text-xs mt-1 truncate ${isShort ? 'text-red-400' : 'text-muted'}`}
                >
                  {formatCurrencyPrecise(Math.abs(member.leftover))} {isShort ? 'short' : 'left'}
                </p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
```

Run: `npx vitest run components/tools/budget/SplitBreakdownCard.test.tsx` → PASS. If the `getAllByText('$3,000.00')` count assertion is off by one, adjust it to the real count rather than changing the component.

- [ ] **Step 10: Add the failing pinned-mortgage-row tests to ExpenseList**

Append to `components/tools/budget/ExpenseList.test.tsx`:

```tsx
describe('ExpenseList pinned mortgage row', () => {
  it('shows the mortgage repayment as a pinned row that cannot be removed', () => {
    render(<ExpenseList expenses={expenses} onChange={() => {}} mortgageMonthly={2500} />)
    expect(screen.getByText('Mortgage repayment')).toBeInTheDocument()
    expect(screen.getByText('$2,500.00')).toBeInTheDocument()
    // Two editable expenses, so exactly two remove buttons — the mortgage row has none
    expect(screen.getAllByRole('button', { name: 'Remove expense' })).toHaveLength(2)
  })

  it('links the pinned row back to the mortgage tool', () => {
    render(<ExpenseList expenses={[]} onChange={() => {}} mortgageMonthly={2500} />)
    expect(screen.getByRole('link', { name: /mortgage/i })).toHaveAttribute(
      'href',
      '/tools/mortgage',
    )
  })

  it('prompts to set up a mortgage when there is no repayment', () => {
    render(<ExpenseList expenses={[]} onChange={() => {}} mortgageMonthly={0} />)
    expect(screen.getByText(/set up your mortgage/i)).toBeInTheDocument()
    expect(screen.queryByText('Mortgage repayment')).not.toBeInTheDocument()
  })

  it('still shows the expense empty state alongside the pinned row', () => {
    render(<ExpenseList expenses={[]} onChange={() => {}} mortgageMonthly={2500} />)
    expect(screen.getByText('No expenses added yet.')).toBeInTheDocument()
  })
})
```

Also update the four existing `ExpenseList` tests to pass `mortgageMonthly={0}`.

- [ ] **Step 11: Run it to verify it fails**

Run: `npx vitest run components/tools/budget/ExpenseList.test.tsx`
Expected: FAIL — no pinned row.

- [ ] **Step 12: Add the pinned row to ExpenseList**

In `components/tools/budget/ExpenseList.tsx`, add `mortgageMonthly: number` to `ExpenseListProps`, import `Link from 'next/link'`, `HouseIcon` from `@/components/ui`, and `formatCurrencyPrecise` from `@/lib/calculations/format`. Then render this immediately inside `<CardContent>`, above the existing empty-state/list conditional:

```tsx
        {mortgageMonthly > 0 ? (
          <div
            className={`
              flex items-center justify-between gap-3 mb-3
              p-4 bg-accent/10 rounded-lg border border-accent/30
            `}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">Mortgage repayment</p>
              <p className="text-xs text-muted mt-0.5">Housing &middot; from your mortgage</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <p className="text-lg font-bold text-accent">
                {formatCurrencyPrecise(mortgageMonthly)}
              </p>
              <Link
                href="/tools/mortgage"
                aria-label="Edit mortgage"
                className="text-muted hover:text-accent transition-colors"
              >
                <HouseIcon width="18" height="18" />
              </Link>
            </div>
          </div>
        ) : (
          <div
            className={`
              flex items-center justify-between gap-3 mb-3
              p-4 bg-background rounded-lg border border-dashed border-border
            `}
          >
            <p className="text-sm text-muted">No mortgage repayment yet.</p>
            <Link
              href="/tools/mortgage"
              className="text-sm text-accent hover:underline shrink-0"
            >
              Set up your mortgage
            </Link>
          </div>
        )}
```

Note the `aria-label="Edit mortgage"` — that is what makes the `link, name: /mortgage/i` query in the test resolve.

- [ ] **Step 13: Run it to verify it passes**

Run: `npx vitest run components/tools/budget`
Expected: PASS. If the `/mortgage/i` link query matches two links in the zero-repayment case, tighten the test query to the exact accessible name.

- [ ] **Step 14: Update the barrel**

`components/tools/budget/index.ts`:

```ts
export { ExpenseItem } from './ExpenseItem'
export { ExpenseList } from './ExpenseList'
export { IncomeCard } from './IncomeCard'
export { BudgetSummaryCard } from './BudgetSummaryCard'
export { SplitBreakdownCard } from './SplitBreakdownCard'
```

- [ ] **Step 15: Verify, format, commit**

```bash
npm run test && npx tsc --noEmit && npm run lint && npm run format
git add -A
git commit -m "Add budget income, summary, and split cards with pinned mortgage row"
```

---

### Task 6: useBudgetPlanner hook

**Files:**
- Create: `components/tools/budget/useBudgetPlanner.ts`
- Create: `components/tools/budget/useBudgetPlanner.test.ts`
- Modify: `components/tools/budget/index.ts`

**Interfaces:**
- Consumes: `budgetRepository` from `@/lib/budget` (Task 3); `useHousehold()` from `@/components/household` returning `{ members, splitConfig, isLoaded }`; `loadMortgageData()` from `@/lib/storage` returning `{ inputs } | null` (Task 4); `calculateSavedMortgageResults` from `@/lib/calculations/mortgage` (Task 4); `computeBudgetSummary`, `computeCategoryBreakdown`, `computeMemberBudgetShares`, `computeMonthlyIncome` from `@/lib/calculations/budget` (Task 2); `CATEGORY_COLORS`, `CHART_ACCENT_COLOR` from `@/components/charts/theme`.
- Produces: `useBudgetPlanner()` returning `{ expenses, setExpenses, takeHomeOverride, setTakeHomeOverride, grossMonthlyIncome, mortgageMonthly, summary, breakdownData, memberShares, hasMembers, isLoaded }`.

- [ ] **Step 1: Write the failing test**

Create `components/tools/budget/useBudgetPlanner.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useBudgetPlanner } from './useBudgetPlanner'
import { MortgageInputs } from '@/types/mortgage'
import { Expense } from '@/types/budget'

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

const expenses: Expense[] = [
  { id: '1', name: 'Power', amount: 180, frequency: 'monthly', category: 'utilities' },
]

beforeEach(() => {
  localStorage.clear()
})

describe('useBudgetPlanner', () => {
  it('starts empty when nothing has been saved', async () => {
    const { result } = renderHook(() => useBudgetPlanner())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.expenses).toEqual([])
    expect(result.current.takeHomeOverride).toBeNull()
    expect(result.current.mortgageMonthly).toBe(0)
    expect(result.current.hasMembers).toBe(false)
  })

  it('loads saved expenses and take-home override', async () => {
    localStorage.setItem('finance-tools-budget-expenses', JSON.stringify(expenses))
    localStorage.setItem('finance-tools-budget-take-home', JSON.stringify(9000))

    const { result } = renderHook(() => useBudgetPlanner())
    await waitFor(() => expect(result.current.expenses).toHaveLength(1))
    expect(result.current.takeHomeOverride).toBe(9000)
    expect(result.current.summary.monthlyIncome).toBe(9000)
  })

  it('pulls the monthly repayment from saved mortgage data', async () => {
    localStorage.setItem('finance-tools-mortgage-inputs', JSON.stringify(savedInputs))
    const { result } = renderHook(() => useBudgetPlanner())
    await waitFor(() => expect(result.current.mortgageMonthly).toBeGreaterThan(0))
    expect(result.current.summary.monthlyExpenses).toBeCloseTo(result.current.mortgageMonthly)
  })

  it('includes the mortgage in the breakdown data', async () => {
    localStorage.setItem('finance-tools-mortgage-inputs', JSON.stringify(savedInputs))
    localStorage.setItem('finance-tools-budget-expenses', JSON.stringify(expenses))

    const { result } = renderHook(() => useBudgetPlanner())
    await waitFor(() => expect(result.current.breakdownData.length).toBeGreaterThan(1))
    expect(result.current.breakdownData[0].name).toBe('Mortgage')
    expect(result.current.breakdownData.some((item) => item.name === 'Utilities')).toBe(true)
  })

  it('persists expense edits', async () => {
    const { result } = renderHook(() => useBudgetPlanner())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    act(() => result.current.setExpenses(expenses))

    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('finance-tools-budget-expenses')!)).toHaveLength(1),
    )
  })

  it('persists a take-home override and clears it again', async () => {
    const { result } = renderHook(() => useBudgetPlanner())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    act(() => result.current.setTakeHomeOverride(9000))
    await waitFor(() =>
      expect(localStorage.getItem('finance-tools-budget-take-home')).toBe('9000'),
    )

    act(() => result.current.setTakeHomeOverride(null))
    await waitFor(() => expect(localStorage.getItem('finance-tools-budget-take-home')).toBeNull())
  })

  it('computes member shares from the household split config', async () => {
    localStorage.setItem(
      'finance-tools-household',
      JSON.stringify([
        { id: 'a', name: 'Alex', income: 100000 },
        { id: 'b', name: 'Sam', income: 50000 },
      ]),
    )
    localStorage.setItem(
      'finance-tools-household-split',
      JSON.stringify({ memberIds: ['a', 'b'], mode: 'even' }),
    )
    localStorage.setItem('finance-tools-budget-expenses', JSON.stringify(expenses))

    const { result } = renderHook(() => useBudgetPlanner())
    await waitFor(() => expect(result.current.memberShares).toHaveLength(2))
    expect(result.current.hasMembers).toBe(true)
    expect(result.current.memberShares[0].share).toBeCloseTo(90)
  })

  it('migrates legacy mortgage expenses on first load', async () => {
    localStorage.setItem(
      'finance-tools-mortgage-expenses',
      JSON.stringify([{ id: 'x', name: 'Rates', amount: 300, frequency: 'quarterly' }]),
    )

    const { result } = renderHook(() => useBudgetPlanner())
    await waitFor(() => expect(result.current.expenses).toHaveLength(1))
    expect(result.current.expenses[0]).toMatchObject({ name: 'Rates', category: 'other' })
    expect(localStorage.getItem('finance-tools-mortgage-expenses')).toBeNull()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run components/tools/budget/useBudgetPlanner.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the hook**

Create `components/tools/budget/useBudgetPlanner.ts`:

```ts
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Expense } from '@/types/budget'
import { budgetRepository } from '@/lib/budget'
import { useHousehold } from '@/components/household'
import { loadMortgageData } from '@/lib/storage'
import { calculateSavedMortgageResults } from '@/lib/calculations/mortgage'
import {
  computeBudgetSummary,
  computeCategoryBreakdown,
  computeMemberBudgetShares,
  computeMonthlyIncome,
} from '@/lib/calculations/budget'
import { CATEGORY_COLORS, CHART_ACCENT_COLOR } from '@/components/charts/theme'

export function useBudgetPlanner() {
  const { members, splitConfig, isLoaded: householdLoaded } = useHousehold()
  const [expenses, setExpensesState] = useState<Expense[]>([])
  const [takeHomeOverride, setTakeHomeOverrideState] = useState<number | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load persisted budget data on mount. The setState calls are deferred into the promise
  // chain, which also satisfies react-hooks/set-state-in-effect.
  useEffect(() => {
    let cancelled = false
    Promise.all([budgetRepository.getExpenses(), budgetRepository.getTakeHomeOverride()]).then(
      ([loadedExpenses, loadedOverride]) => {
        if (cancelled) return
        setExpensesState(loadedExpenses)
        setTakeHomeOverrideState(loadedOverride)
        setIsLoaded(true)
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  const setExpenses = useCallback((next: Expense[]) => {
    setExpensesState(next)
    budgetRepository.saveExpenses(next)
  }, [])

  const setTakeHomeOverride = useCallback((next: number | null) => {
    setTakeHomeOverrideState(next)
    budgetRepository.saveTakeHomeOverride(next)
  }, [])

  // The mortgage repayment is read one-way from the mortgage tool's own storage —
  // the mortgage tool has no knowledge of the budget.
  const mortgageMonthly = useMemo(() => {
    if (!householdLoaded) return 0
    const saved = loadMortgageData()
    if (!saved) return 0
    const results = calculateSavedMortgageResults(saved.inputs, members, splitConfig)
    return results?.monthlyMortgagePayment ?? 0
  }, [householdLoaded, members, splitConfig])

  const grossMonthlyIncome = useMemo(() => computeMonthlyIncome(members, null), [members])

  const summary = useMemo(
    () => computeBudgetSummary(expenses, mortgageMonthly, members, takeHomeOverride),
    [expenses, mortgageMonthly, members, takeHomeOverride],
  )

  const breakdownData = useMemo(
    () => computeCategoryBreakdown(expenses, mortgageMonthly, CATEGORY_COLORS, CHART_ACCENT_COLOR),
    [expenses, mortgageMonthly],
  )

  const memberShares = useMemo(
    () =>
      computeMemberBudgetShares(members, splitConfig, takeHomeOverride, summary.monthlyExpenses),
    [members, splitConfig, takeHomeOverride, summary.monthlyExpenses],
  )

  return {
    expenses,
    setExpenses,
    takeHomeOverride,
    setTakeHomeOverride,
    grossMonthlyIncome,
    mortgageMonthly,
    summary,
    breakdownData,
    memberShares,
    hasMembers: members.length > 0,
    isLoaded: isLoaded && householdLoaded,
  }
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run components/tools/budget/useBudgetPlanner.test.ts`
Expected: PASS. If the `memberShares[0].share` assertion is off, recompute it: total monthly outgoing is $180 (power only, no mortgage saved in that test), split evenly across two members = $90.

- [ ] **Step 5: Export from the barrel**

Add to `components/tools/budget/index.ts`:

```ts
export { useBudgetPlanner } from './useBudgetPlanner'
```

- [ ] **Step 6: Verify, format, commit**

```bash
npm run test && npx tsc --noEmit && npm run lint && npm run format
git add -A
git commit -m "Add useBudgetPlanner hook"
```

---

### Task 7: Budget page and navigation

**Files:**
- Create: `app/tools/budget/page.tsx`
- Modify: `components/layout/navLinks.ts`
- Modify: `components/layout/NavDrawer.test.tsx` / `NavDropdown.test.tsx` / `NavMenu.test.tsx` (only if they assert the Budget link is disabled — check first)

**Interfaces:**
- Consumes: everything from `@/components/tools/budget` (Tasks 5–6); `ExpenseBreakdownChart` from `@/components/charts`; `PageContainer`, `ToolHeader` from `@/components/layout`.
- Produces: the `/tools/budget` route.

- [ ] **Step 1: Enable the nav link**

In `components/layout/navLinks.ts`:

```ts
  { key: 'budget', label: 'Budget', href: '/tools/budget' },
```

- [ ] **Step 2: Check the nav tests**

Run: `grep -rn "Budget\|disabled" components/layout/*.test.tsx`

If any test asserts the Budget link is disabled or has `href="#"`, update it to assert `href="/tools/budget"` and that it is enabled. If no test references it, skip this step.

- [ ] **Step 3: Write the page**

Create `app/tools/budget/page.tsx`:

```tsx
'use client'

import {
  ExpenseList,
  IncomeCard,
  BudgetSummaryCard,
  SplitBreakdownCard,
  useBudgetPlanner,
} from '@/components/tools/budget'
import { ExpenseBreakdownChart } from '@/components/charts'
import { PageContainer, ToolHeader } from '@/components/layout'

export default function BudgetPlannerPage() {
  const {
    expenses,
    setExpenses,
    takeHomeOverride,
    setTakeHomeOverride,
    grossMonthlyIncome,
    mortgageMonthly,
    summary,
    breakdownData,
    memberShares,
    hasMembers,
  } = useBudgetPlanner()

  return (
    <div className="min-h-screen bg-background">
      <ToolHeader title="Budget Planner" actions={[]} />

      <main>
        <PageContainer className="py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Inputs */}
            <div className="space-y-6">
              <IncomeCard
                grossMonthlyIncome={grossMonthlyIncome}
                takeHomeOverride={takeHomeOverride}
                onTakeHomeChange={setTakeHomeOverride}
                hasMembers={hasMembers}
              />
              <ExpenseList
                expenses={expenses}
                onChange={setExpenses}
                mortgageMonthly={mortgageMonthly}
              />
            </div>

            {/* Right Column - Results */}
            <div className="space-y-6">
              <BudgetSummaryCard summary={summary} />
              <SplitBreakdownCard shares={memberShares} />
              <ExpenseBreakdownChart data={breakdownData} />
            </div>
          </div>
        </PageContainer>
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Confirm ToolHeader accepts an empty actions array**

Read `components/ui/HeaderActions.tsx`. If it renders a wrapper or breaks on an empty array, add an early `if (actions.length === 0) return null` guard to `HeaderActions` and add a test for it in `components/ui/HeaderActions.test.tsx`:

```tsx
  it('renders nothing when there are no actions', () => {
    const { container } = render(<HeaderActions actions={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
```

- [ ] **Step 5: Verify the route builds and renders**

Run: `npm run build`
Expected: PASS, with `/tools/budget` listed in the route output.

- [ ] **Step 6: Verify in the browser**

Start the dev server and check `/tools/budget`: the Budget nav link works, adding an expense with a category updates the chart and summary, the pinned mortgage row shows the same figure as `/tools/mortgage`, and the split card appears when 2+ household members are selected on `/profile`.

- [ ] **Step 7: Verify, format, commit**

```bash
npm run test && npx tsc --noEmit && npm run lint && npm run format
git add -A
git commit -m "Add budget planner page and enable its nav link"
```

---

### Task 8: Dashboard budget card

**Files:**
- Create: `components/dashboard/BudgetSnapshotCard.tsx` + `.test.tsx`
- Delete: `components/dashboard/BudgetPlaceholderCard.tsx` + `.test.tsx`
- Modify: `components/dashboard/useDashboardData.ts` + `.test.ts`, `components/dashboard/index.ts`, `app/page.tsx`

**Interfaces:**
- Consumes: `budgetRepository` from `@/lib/budget`; `computeBudgetSummary`, `computeCategoryBreakdown` from `@/lib/calculations/budget`; `BudgetSummary`, `ExpenseBreakdownItem` from `@/types/budget`.
- Produces: `useDashboardData()` returning `{ mortgageResults, budgetSummary, topCategories }` where `budgetSummary: BudgetSummary | null` and `topCategories: ExpenseBreakdownItem[]`; `BudgetSnapshotCard({ summary, topCategories })`.

- [ ] **Step 1: Write the failing card test**

Create `components/dashboard/BudgetSnapshotCard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BudgetSnapshotCard } from './BudgetSnapshotCard'

describe('BudgetSnapshotCard', () => {
  it('prompts to get started when there is no budget yet', () => {
    render(<BudgetSnapshotCard summary={null} topCategories={[]} />)
    expect(screen.getByText(/get started/i)).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/tools/budget')
  })

  it('shows the monthly surplus and top categories', () => {
    render(
      <BudgetSnapshotCard
        summary={{ monthlyIncome: 9000, monthlyExpenses: 6500, surplus: 2500 }}
        topCategories={[
          { name: 'Mortgage', value: 2500, color: '#a' },
          { name: 'Utilities', value: 300, color: '#b' },
        ]}
      />,
    )
    expect(screen.getByText('$2,500.00/mo left')).toBeInTheDocument()
    expect(screen.getByText(/Mortgage/)).toBeInTheDocument()
    expect(screen.getByText(/Utilities/)).toBeInTheDocument()
  })

  it('describes a negative surplus as short', () => {
    render(
      <BudgetSnapshotCard
        summary={{ monthlyIncome: 5000, monthlyExpenses: 6500, surplus: -1500 }}
        topCategories={[]}
      />,
    )
    expect(screen.getByText('$1,500.00/mo short')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it to verify it fails, then write the card**

Run: `npx vitest run components/dashboard/BudgetSnapshotCard.test.tsx` → FAIL.

Create `components/dashboard/BudgetSnapshotCard.tsx`:

```tsx
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, ReceiptIcon } from '@/components/ui'
import { BudgetSummary, ExpenseBreakdownItem } from '@/types/budget'
import { formatCurrencyPrecise } from '@/lib/calculations/format'

interface BudgetSnapshotCardProps {
  summary: BudgetSummary | null
  topCategories: ExpenseBreakdownItem[]
}

export function BudgetSnapshotCard({ summary, topCategories }: BudgetSnapshotCardProps) {
  if (!summary) {
    return (
      <Link href="/tools/budget" className="block group">
        <Card className="h-full border-dashed transition-colors hover:border-accent/50">
          <CardHeader>
            <CardTitle
              className={`
                flex items-center gap-2 text-muted
                group-hover:text-accent transition-colors
              `}
            >
              <ReceiptIcon width="20" height="20" />
              Budget Planner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted">Get started with the budget planner.</p>
          </CardContent>
        </Card>
      </Link>
    )
  }

  const isShort = summary.surplus < 0

  return (
    <Link href="/tools/budget" className="block group">
      <Card className="h-full transition-colors hover:border-accent/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 group-hover:text-accent transition-colors">
            <ReceiptIcon width="20" height="20" className="text-accent" />
            Budget Planner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`font-medium ${isShort ? 'text-red-400' : 'text-foreground'}`}>
            {formatCurrencyPrecise(Math.abs(summary.surplus))}/mo {isShort ? 'short' : 'left'}
          </p>
          {topCategories.length > 0 && (
            <p className="text-sm text-muted mt-1">
              {topCategories.map((category) => category.name).join(' · ')}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
```

Run: `npx vitest run components/dashboard/BudgetSnapshotCard.test.tsx` → PASS.

- [ ] **Step 3: Add the failing dashboard-hook tests**

Append to `components/dashboard/useDashboardData.test.ts`:

```ts
describe('useDashboardData budget', () => {
  it('returns a null budget summary when nothing has been saved', async () => {
    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.mortgageResults).toBeNull())
    expect(result.current.budgetSummary).toBeNull()
    expect(result.current.topCategories).toEqual([])
  })

  it('summarises saved budget expenses and returns the top three categories', async () => {
    localStorage.setItem(
      'finance-tools-budget-expenses',
      JSON.stringify([
        { id: '1', name: 'Power', amount: 180, frequency: 'monthly', category: 'utilities' },
        { id: '2', name: 'Rates', amount: 300, frequency: 'quarterly', category: 'housing' },
        { id: '3', name: 'Car', amount: 400, frequency: 'monthly', category: 'transport' },
        { id: '4', name: 'Gym', amount: 50, frequency: 'monthly', category: 'health' },
      ]),
    )
    localStorage.setItem('finance-tools-budget-take-home', JSON.stringify(5000))

    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.budgetSummary).not.toBeNull())
    expect(result.current.budgetSummary!.monthlyExpenses).toBeCloseTo(180 + 100 + 400 + 50)
    expect(result.current.budgetSummary!.surplus).toBeCloseTo(5000 - 730)
    expect(result.current.topCategories).toHaveLength(3)
    expect(result.current.topCategories[0].name).toBe('Transport')
  })
})
```

- [ ] **Step 4: Run it to verify it fails, then extend the hook**

Run: `npx vitest run components/dashboard/useDashboardData.test.ts` → FAIL.

In `components/dashboard/useDashboardData.ts`, add budget state and a second load effect:

```ts
import { budgetRepository } from '@/lib/budget'
import { computeBudgetSummary, computeCategoryBreakdown } from '@/lib/calculations/budget'
import { BudgetSummary, ExpenseBreakdownItem } from '@/types/budget'
import { CATEGORY_COLORS, CHART_ACCENT_COLOR } from '@/components/charts/theme'
```

```ts
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null)
  const [topCategories, setTopCategories] = useState<ExpenseBreakdownItem[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all([budgetRepository.getExpenses(), budgetRepository.getTakeHomeOverride()]).then(
      ([expenses, takeHomeOverride]) => {
        if (cancelled) return
        if (expenses.length === 0 && takeHomeOverride === null) {
          setBudgetSummary(null)
          setTopCategories([])
          return
        }
        const mortgageMonthly = mortgageResults?.monthlyMortgagePayment ?? 0
        setBudgetSummary(
          computeBudgetSummary(expenses, mortgageMonthly, members, takeHomeOverride),
        )
        setTopCategories(
          computeCategoryBreakdown(expenses, mortgageMonthly, CATEGORY_COLORS, CHART_ACCENT_COLOR)
            .slice()
            .sort((a, b) => b.value - a.value)
            .slice(0, 3),
        )
      },
    )
    return () => {
      cancelled = true
    }
  }, [members, mortgageResults])
```

Return `{ mortgageResults, budgetSummary, topCategories }`.

Run: `npx vitest run components/dashboard/useDashboardData.test.ts` → PASS.

- [ ] **Step 5: Swap the card on the dashboard**

```bash
git rm components/dashboard/BudgetPlaceholderCard.tsx components/dashboard/BudgetPlaceholderCard.test.tsx
```

In `components/dashboard/index.ts`, replace the `BudgetPlaceholderCard` export with:

```ts
export { BudgetSnapshotCard } from './BudgetSnapshotCard'
```

In `app/page.tsx`, change the import to `BudgetSnapshotCard` and the element to:

```tsx
            <BudgetSnapshotCard summary={budgetSummary} topCategories={topCategories} />
```

destructuring `budgetSummary` and `topCategories` from `useDashboardData()`.

- [ ] **Step 6: Verify, format, commit**

```bash
npm run test && npx tsc --noEmit && npm run lint && npm run build && npm run format
git add -A
git commit -m "Replace dashboard budget placeholder with a real snapshot card"
```

---

### Task 9: Documentation and final verification

**Files:**
- Modify: `CLAUDE.md`, `README.md`

- [ ] **Step 1: Update CLAUDE.md**

Make these edits:

- Opening paragraph: change "one tool so far — a mortgage calculator" to "two tools — a mortgage calculator covering all eight Australian states/territories, and a budget planner".
- **Structure** section: add
  - `app/tools/budget/page.tsx` alongside the mortgage route mention
  - `components/tools/budget/` — `ExpenseList`/`ExpenseItem` (with category), `IncomeCard`, `BudgetSummaryCard`, `SplitBreakdownCard`, `useBudgetPlanner`
  - `lib/calculations/budget.ts` — expense/income/split maths, colours injected as parameters so `lib/` stays UI-free
  - `lib/calculations/format.ts` — shared `formatCurrency`/`formatCurrencyPrecise`, used by every tool and chart (do not import them from `lib/calculations/mortgage.ts`)
  - `lib/budget/` — repository + `localBudgetRepository` + `budgetRepository` singleton, including the one-time `finance-tools-mortgage-expenses` migration
  - `types/budget.ts`
- **Mortgage calculator** section: remove the recurring-expenses mention from the feature list; note that `calculateMortgageResults(inputs, members, splitConfig)` takes no expenses and that `splitBreakdown` divides the monthly repayment only; note that `lib/storage.ts` no longer stores or encodes expenses but `decodeMortgageData` still tolerates the legacy `e` field on old share links.
- Add a **Budget planner (`app/tools/budget`)** section covering: expenses with categories, the pinned read-only mortgage row (read one-way via `calculateSavedMortgageResults`), income derived from household gross with an optional take-home override apportioned by gross income for per-member leftovers, and the summary/split/chart layout.
- **Conventions**: note that `calculateSavedMortgageResults` is the single entry point for turning saved mortgage inputs into results, so the mortgage page, dashboard, and budget never disagree on the repayment figure.

- [ ] **Step 2: Update README.md**

Add the budget planner to the tools list with a one-line description, and remove recurring expenses from the mortgage calculator's feature list.

- [ ] **Step 3: Full verification**

Run each and confirm it passes before claiming completion:

```bash
npm run test
```
```bash
npx tsc --noEmit
```
```bash
npm run lint
```
```bash
npm run build
```

- [ ] **Step 4: Manual smoke test**

With the dev server running, confirm end to end:
1. `/tools/mortgage` — no expenses section, no pie chart, results summary has no "Total Monthly", split card reads "Repayment split".
2. `/tools/budget` — add two expenses in different categories; chart groups them; summary updates; the pinned mortgage row matches the mortgage page's monthly equivalent.
3. `/profile` — select 2+ members; the budget split card appears with shares and leftovers.
4. `/` — the budget card shows the surplus and top categories, and links to `/tools/budget`.
5. Migration: set `finance-tools-mortgage-expenses` in devtools, clear `finance-tools-budget-expenses`, reload `/tools/budget`, confirm the rows appear as "Other" and the legacy key is gone.

- [ ] **Step 5: Format and commit**

```bash
npm run format
git add -A
git commit -m "Update CLAUDE.md and README for the budget planner"
```

---

## Self-Review

**Spec coverage:** type moves (T2, T4) · formatter extraction (T1) · mortgage loan-only incl. storage and share tolerance (T4) · repository + migration (T3) · all five calculation functions (T2) · `CATEGORY_COLORS` (T2) · budget page layout and hook (T5–T7) · pinned mortgage row (T5) · income card with override (T5) · split card with leftovers (T5) · nav link (T7) · dashboard card (T8) · testing (every task) · docs (T9). No gaps.

**Deviations from the spec, both deliberate:**
1. Colours are passed into `computeCategoryBreakdown` as parameters rather than imported from `components/charts/theme.ts`, so `lib/calculations/` keeps its no-UI-imports rule and the dependency direction stays `components → lib`.
2. Task 4 adds `calculateSavedMortgageResults`, not named in the spec. Without it the budget's pinned row and the dashboard would show a repayment figure that disagrees with the mortgage page, which already applies the effective-deposit adjustment. This is the smallest fix that makes "pulls the total monthly from the mortgage calculator" literally true.
