# Profile Menu, Dashboard Cleanup & Consistent Page Width Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move household management out of the dashboard/nav-link into a profile icon dropdown in the top nav, trim the dashboard to tool cards only, and introduce a shared `PageContainer` component so every page uses the same 1600px width.

**Architecture:** A new `components/layout/PageContainer.tsx` replaces the six duplicated `max-w-* mx-auto px-4 sm:px-6 lg:px-8` wrapper divs across `TopNav`, the dashboard, the profile page, and the mortgage page. A new `components/layout/ProfileMenu.tsx` (rendered inside `TopNav`) reuses the existing `formatCompactIncome` helper and `useHousehold()` hook to show a household summary + link to `/profile` in a dropdown, replacing the old `HouseholdSummaryCard` dashboard tile (deleted) and the old "Profile" nav link (removed).

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS v4, Vitest + React Testing Library, existing `components/ui/*` and `components/layout/*` primitives.

## Global Constraints

- The whole site standardizes on **1600px** (`max-w-[1600px]`) as its single width, via `PageContainer` — no page keeps a different `max-w-*` value.
- `PageContainer` only replaces the inner width-constrained `<div>` at each call site — outer semantic elements (`<header>`, `<main>`, `<footer>`, `<nav>`) are untouched.
- The profile icon + dropdown is visible at **every screen size** (not folded into the mobile hamburger) — it's a separate "account" affordance, not a tool-navigation link.
- `HouseholdSummaryCard.tsx` and its test are **deleted**, not left unused — its formatting logic (`formatCompactIncome`) moves into `ProfileMenu`.
- Dropdown/menu interactions (both `ProfileMenu` and `TopNav`'s existing mobile menu) use the same click-outside/Escape-closing idiom already established in this codebase (`components/ui/HeaderActions.tsx`).
- Follow this repo's Prettier config: single quotes, no semicolons, trailing commas everywhere (except TS interface/type members, which aren't comma-delimited), printWidth 100, tabWidth 2.
- Reuse `components/ui/*` primitives (`Button`, icons) — never raw `<button>`.
- Every new or changed file gets a test in the same task, per this repo's convention — except where a file's only change is swapping an inner wrapper `<div>` for `<PageContainer>` with no behavioral change (the profile and mortgage pages in Task 5): `PageContainer`'s own unit test already covers the wrapper's behavior, so those two files only need their *existing* tests to keep passing, not new ones.

---

### Task 1: `PageContainer` shared component

**Files:**
- Create: `components/layout/PageContainer.tsx`
- Create: `components/layout/PageContainer.test.tsx`
- Modify: `components/layout/index.ts`

**Interfaces:**
- Produces: `PageContainer({ children, className? })` — consumed by Task 3 (`TopNav`), Task 4 (`app/page.tsx`), Task 5 (`app/profile/page.tsx`, `app/tools/mortgage/page.tsx`).

- [ ] **Step 1: Write the failing test**

```tsx
// components/layout/PageContainer.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageContainer } from './PageContainer'

describe('PageContainer', () => {
  it('renders its children', () => {
    render(
      <PageContainer>
        <p>Content</p>
      </PageContainer>,
    )
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('applies the shared width and padding classes', () => {
    render(
      <PageContainer>
        <p>Content</p>
      </PageContainer>,
    )
    const container = screen.getByText('Content').parentElement
    expect(container).toHaveClass('max-w-[1600px]', 'mx-auto', 'px-4', 'sm:px-6', 'lg:px-8')
  })

  it('merges an additional className', () => {
    render(
      <PageContainer className="py-8">
        <p>Content</p>
      </PageContainer>,
    )
    const container = screen.getByText('Content').parentElement
    expect(container).toHaveClass('py-8', 'max-w-[1600px]')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/layout/PageContainer.test.tsx`
Expected: FAIL with "Cannot find module './PageContainer'"

- [ ] **Step 3: Write the implementation**

```tsx
// components/layout/PageContainer.tsx
import { ReactNode } from 'react'

interface PageContainerProps {
  children: ReactNode
  className?: string
}

export function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className={`max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/layout/PageContainer.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Update the barrel export**

```ts
// components/layout/index.ts
export { TopNav } from './TopNav'
export { PageContainer } from './PageContainer'
```

- [ ] **Step 6: Commit**

```bash
git add components/layout/PageContainer.tsx components/layout/PageContainer.test.tsx components/layout/index.ts
git commit -m "Add shared PageContainer component for consistent page width"
```

---

### Task 2: `ProfileMenu` component

**Files:**
- Modify: `components/ui/icons.tsx`
- Modify: `components/ui/index.ts`
- Create: `components/layout/ProfileMenu.tsx`
- Create: `components/layout/ProfileMenu.test.tsx`

**Interfaces:**
- Consumes: `useHousehold` from `@/components/household` (existing), `formatCompactIncome` from `@/lib/calculations/household` (existing), new `UserIcon` from `@/components/ui`
- Produces: `ProfileMenu` component — consumed by Task 3 (`TopNav`, via relative import `./ProfileMenu`, not the barrel — nothing outside `components/layout/` needs it directly)

- [ ] **Step 1: Add `UserIcon` to the icon map**

```ts
// components/ui/icons.tsx
export {
  Wallet as WalletIcon,
  Home as HouseIcon,
  PlusCircle as PlusCircleIcon,
  ArrowLeft as ArrowLeftIcon,
  Share2 as ShareIcon,
  RotateCcw as ResetIcon,
  Check as CheckIcon,
  Copy as CopyIcon,
  X as CloseIcon,
  Trash2 as TrashIcon,
  Plus as PlusIcon,
  AlertTriangle as WarningIcon,
  Calculator as CalculatorIcon,
  Receipt as ReceiptIcon,
  ListChecks as ListChecksIcon,
  BarChart3 as ChartBarIcon,
  TrendingDown as TrendingDownIcon,
  PieChart as PieChartIcon,
  MoreVertical as MoreIcon,
  User as UserIcon,
} from 'lucide-react'
```

- [ ] **Step 2: Add `UserIcon` to the `components/ui` barrel**

```ts
// components/ui/index.ts
export { Button } from './Button'
export { Input } from './Input'
export { Select } from './Select'
export { Card, CardHeader, CardTitle, CardContent } from './Card'
export { Checkbox } from './Checkbox'
export { Modal } from './Modal'
export { HeaderActions } from './HeaderActions'
export type { HeaderAction } from './HeaderActions'
export {
  WalletIcon,
  HouseIcon,
  PlusCircleIcon,
  ArrowLeftIcon,
  ShareIcon,
  ResetIcon,
  CheckIcon,
  CopyIcon,
  CloseIcon,
  TrashIcon,
  PlusIcon,
  WarningIcon,
  CalculatorIcon,
  ReceiptIcon,
  ListChecksIcon,
  ChartBarIcon,
  TrendingDownIcon,
  PieChartIcon,
  MoreIcon,
  UserIcon,
} from './icons'
```

- [ ] **Step 3: Write the failing test**

```tsx
// components/layout/ProfileMenu.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileMenu } from './ProfileMenu'

beforeEach(() => {
  localStorage.clear()
})

describe('ProfileMenu', () => {
  it('shows a setup CTA when the household is empty', async () => {
    render(<ProfileMenu />)
    await userEvent.click(screen.getByRole('button', { name: 'Open profile menu' }))

    expect(screen.getByText('Set up your household to get started.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /manage household/i })).toHaveAttribute(
      'href',
      '/profile',
    )
  })

  it('shows member count, combined income, and names once configured', async () => {
    localStorage.setItem(
      'finance-tools-household',
      JSON.stringify([
        { id: '1', name: 'Rafael', income: 95000 },
        { id: '2', name: 'Partner', income: 80000 },
      ]),
    )
    render(<ProfileMenu />)
    await userEvent.click(screen.getByRole('button', { name: 'Open profile menu' }))

    expect(await screen.findByText('2 members · $175k/yr')).toBeInTheDocument()
    expect(screen.getByText('Rafael, Partner')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /manage household/i })).toHaveAttribute(
      'href',
      '/profile',
    )
  })

  it('opens and closes via click-outside/Escape', async () => {
    render(<ProfileMenu />)
    const toggle = screen.getByRole('button', { name: 'Open profile menu' })

    await userEvent.click(toggle)
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run components/layout/ProfileMenu.test.tsx`
Expected: FAIL with "Cannot find module './ProfileMenu'"

- [ ] **Step 5: Write the implementation**

```tsx
// components/layout/ProfileMenu.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Button, UserIcon } from '@/components/ui'
import { useHousehold } from '@/components/household'
import { formatCompactIncome } from '@/lib/calculations/household'

export function ProfileMenu() {
  const { members } = useHousehold()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const combinedIncome = members.reduce((total, member) => total + member.income, 0)

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-label="Open profile menu"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <UserIcon width="20" height="20" />
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-10 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
        >
          {members.length === 0 ? (
            <div className="px-4 py-3">
              <p className="text-sm text-muted mb-2">Set up your household to get started.</p>
              <Link
                href="/profile"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="text-sm text-accent hover:underline"
              >
                Manage household →
              </Link>
            </div>
          ) : (
            <div className="px-4 py-3">
              <p className="text-sm font-medium text-foreground">
                {members.length} member{members.length === 1 ? '' : 's'} ·{' '}
                {formatCompactIncome(combinedIncome)}/yr
              </p>
              <p className="text-sm text-muted mt-1">
                {members.map((member) => member.name).join(', ')}
              </p>
              <Link
                href="/profile"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="mt-3 block text-sm text-accent hover:underline"
              >
                Manage household →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run components/layout/ProfileMenu.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 7: Commit**

```bash
git add components/ui/icons.tsx components/ui/index.ts components/layout/ProfileMenu.tsx components/layout/ProfileMenu.test.tsx
git commit -m "Add ProfileMenu dropdown with household summary"
```

---

### Task 3: Update `TopNav` — remove Profile link, add `ProfileMenu`, use `PageContainer`

**Files:**
- Modify: `components/layout/TopNav.tsx`
- Modify: `components/layout/TopNav.test.tsx`

**Interfaces:**
- Consumes: `PageContainer` (Task 1), `ProfileMenu` (Task 2), both via relative import within `components/layout/`

- [ ] **Step 1: Update the failing tests**

```tsx
// components/layout/TopNav.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TopNav } from './TopNav'

const mockUsePathname = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

beforeEach(() => {
  localStorage.clear()
  mockUsePathname.mockReturnValue('/')
})

describe('TopNav', () => {
  it('renders a link to Mortgage but not a plain Profile link', () => {
    render(<TopNav />)
    expect(screen.getByRole('link', { name: 'Mortgage' })).toHaveAttribute(
      'href',
      '/tools/mortgage',
    )
    expect(screen.queryByRole('link', { name: 'Profile' })).not.toBeInTheDocument()
  })

  it('shows the budget link as disabled, not a link', () => {
    render(<TopNav />)
    expect(screen.queryByRole('link', { name: /budget/i })).not.toBeInTheDocument()
    expect(screen.getAllByText(/budget/i).length).toBeGreaterThan(0)
  })

  it('opens and closes the mobile menu', async () => {
    render(<TopNav />)

    const toggle = screen.getByRole('button', { name: 'Open navigation menu' })
    await userEvent.click(toggle)
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('renders the profile menu button, always visible', () => {
    render(<TopNav />)
    expect(screen.getByRole('button', { name: 'Open profile menu' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run components/layout/TopNav.test.tsx`
Expected: FAIL — "Profile" link still renders (not yet removed); "Open profile menu" button doesn't exist yet

- [ ] **Step 3: Update `TopNav.tsx`**

```tsx
// components/layout/TopNav.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button, WalletIcon, MoreIcon } from '@/components/ui'
import { PageContainer } from './PageContainer'
import { ProfileMenu } from './ProfileMenu'

interface NavLink {
  key: string
  label: string
  href: string
  disabled?: boolean
}

const NAV_LINKS: NavLink[] = [
  { key: 'mortgage', label: 'Mortgage', href: '/tools/mortgage' },
  { key: 'budget', label: 'Budget', href: '#', disabled: true },
]

export function TopNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const linkClassName = (link: NavLink) => {
    if (link.disabled) return 'text-muted/50 cursor-not-allowed'
    return pathname === link.href
      ? 'text-accent'
      : 'text-muted hover:text-foreground transition-colors'
  }

  return (
    <nav className="border-b border-border">
      <PageContainer className="flex h-16 items-center justify-between">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold text-foreground">
          <WalletIcon width="20" height="20" className="text-accent" />
          Finance Tools
        </Link>

        <div className="flex items-center gap-3">
          {/* Inline links from sm: up */}
          <div className="hidden items-center gap-6 text-sm font-medium sm:flex">
            {NAV_LINKS.map((link) =>
              link.disabled ? (
                <span key={link.key} className={linkClassName(link)}>
                  {link.label} (soon)
                </span>
              ) : (
                <Link key={link.key} href={link.href} className={linkClassName(link)}>
                  {link.label}
                </Link>
              ),
            )}
          </div>

          <ProfileMenu />

          {/* Collapsed menu below sm: */}
          <div className="relative shrink-0 sm:hidden" ref={menuRef}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setOpen((isOpen) => !isOpen)}
              aria-label="Open navigation menu"
              aria-haspopup="menu"
              aria-expanded={open}
            >
              <MoreIcon width="20" height="20" />
            </Button>

            {open && (
              <div
                role="menu"
                className="absolute right-0 top-full z-10 mt-2 w-44 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
              >
                {NAV_LINKS.map((link) =>
                  link.disabled ? (
                    <span
                      key={link.key}
                      className="block cursor-not-allowed px-4 py-2.5 text-sm text-muted/50"
                    >
                      {link.label} (soon)
                    </span>
                  ) : (
                    <Link
                      key={link.key}
                      href={link.href}
                      role="menuitem"
                      onClick={() => setOpen(false)}
                      className={`block px-4 py-2.5 text-sm transition-colors hover:bg-border ${
                        pathname === link.href ? 'text-accent' : 'text-foreground'
                      }`}
                    >
                      {link.label}
                    </Link>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      </PageContainer>
    </nav>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run components/layout/TopNav.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Run the layout test that renders `RootLayout`, to confirm no regression**

Run: `npx vitest run app/layout.test.tsx`
Expected: PASS (unchanged — `RootLayout` still renders `TopNav`, and `TopNav`'s content changes don't affect the assertions there)

- [ ] **Step 6: Commit**

```bash
git add components/layout/TopNav.tsx components/layout/TopNav.test.tsx
git commit -m "Remove Profile nav link, add always-visible ProfileMenu, use PageContainer"
```

---

### Task 4: Dashboard cleanup — remove household tile, trim `useDashboardData`, use `PageContainer`

**Files:**
- Delete: `components/dashboard/HouseholdSummaryCard.tsx`
- Delete: `components/dashboard/HouseholdSummaryCard.test.tsx`
- Modify: `components/dashboard/index.ts`
- Modify: `components/dashboard/useDashboardData.ts`
- Modify: `components/dashboard/useDashboardData.test.ts`
- Modify: `app/page.tsx`
- Modify: `app/page.test.tsx`

**Interfaces:**
- Produces: `useDashboardData(): { mortgageResults: MortgageResults | null }` (was `{ members, mortgageResults }`) — the only consumer, `app/page.tsx`, updates in this same task.

- [ ] **Step 1: Update the failing test for `useDashboardData`**

```ts
// components/dashboard/useDashboardData.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDashboardData } from './useDashboardData'
import { MortgageInputs } from '@/types/mortgage'

const savedInputs: MortgageInputs = {
  loanAmount: 600000,
  deposit: 100000,
  interestRate: 6,
  loanTermYears: 30,
  repaymentFrequency: 'monthly',
  offsetBalance: 0,
  buyerType: 'standard',
  includeLegalFees: true,
  includeBuildingInspection: true,
  splitMemberIds: [],
  splitMode: 'even',
}

beforeEach(() => {
  localStorage.clear()
})

describe('useDashboardData', () => {
  it('returns no mortgage results when nothing has been saved, and no longer exposes members', async () => {
    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.mortgageResults).toBeNull())
    expect(result.current).not.toHaveProperty('members')
  })

  it('computes mortgage results from saved inputs, once loan details exist', async () => {
    localStorage.setItem('finance-tools-mortgage-inputs', JSON.stringify(savedInputs))
    localStorage.setItem('finance-tools-mortgage-expenses', JSON.stringify([]))

    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.mortgageResults).not.toBeNull())
    expect(result.current.mortgageResults!.monthlyMortgagePayment).toBeGreaterThan(0)
  })

  it('computes mortgage results using saved household members for the split', async () => {
    localStorage.setItem(
      'finance-tools-household',
      JSON.stringify([
        { id: 'a', name: 'Alex', income: 100000 },
        { id: 'b', name: 'Sam', income: 50000 },
      ]),
    )
    localStorage.setItem(
      'finance-tools-mortgage-inputs',
      JSON.stringify({ ...savedInputs, splitMemberIds: ['a', 'b'] }),
    )
    localStorage.setItem('finance-tools-mortgage-expenses', JSON.stringify([]))

    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.mortgageResults).not.toBeNull())
    expect(result.current.mortgageResults!.splitBreakdown).toHaveLength(2)
  })

  it('leaves mortgage results null when saved inputs have no loan amount', async () => {
    localStorage.setItem(
      'finance-tools-mortgage-inputs',
      JSON.stringify({ ...savedInputs, loanAmount: 0 }),
    )
    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.mortgageResults).toBeNull())
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/dashboard/useDashboardData.test.ts`
Expected: FAIL — the first test's `expect(result.current).not.toHaveProperty('members')` fails because the current implementation still returns `{ members, mortgageResults }`

- [ ] **Step 3: Update `useDashboardData.ts`'s return statement**

```ts
// components/dashboard/useDashboardData.ts — only the final `return` line changes
'use client'

import { useEffect, useState } from 'react'
import { useHousehold } from '@/components/household'
import { loadMortgageData } from '@/lib/storage'
import { calculateMortgageResults } from '@/lib/calculations/mortgage'
import { MortgageResults } from '@/types/mortgage'

export function useDashboardData() {
  const { members } = useHousehold()
  const [mortgageResults, setMortgageResults] = useState<MortgageResults | null>(null)

  useEffect(() => {
    let cancelled = false
    // Deferred via a microtask purely to satisfy react-hooks/set-state-in-effect's static
    // analysis (it only flags setState calls made directly/synchronously in the effect body) —
    // loadMortgageData() itself is synchronous localStorage access, not real async I/O.
    Promise.resolve().then(() => {
      if (cancelled) return
      const saved = loadMortgageData()
      if (
        saved &&
        saved.inputs.loanAmount > 0 &&
        saved.inputs.interestRate > 0 &&
        saved.inputs.loanTermYears > 0
      ) {
        setMortgageResults(calculateMortgageResults(saved.inputs, saved.expenses, members))
      } else {
        setMortgageResults(null)
      }
    })
    return () => {
      cancelled = true
    }
  }, [members])

  return { mortgageResults }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/dashboard/useDashboardData.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Delete `HouseholdSummaryCard` and its test**

```bash
git rm components/dashboard/HouseholdSummaryCard.tsx components/dashboard/HouseholdSummaryCard.test.tsx
```

- [ ] **Step 6: Update the dashboard barrel**

```ts
// components/dashboard/index.ts
export { MortgageSnapshotCard } from './MortgageSnapshotCard'
export { BudgetPlaceholderCard } from './BudgetPlaceholderCard'
export { useDashboardData } from './useDashboardData'
```

- [ ] **Step 7: Update the failing test for `app/page.tsx`**

```tsx
// app/page.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import HomePage from './page'
import { MortgageInputs } from '@/types/mortgage'

const savedInputs: MortgageInputs = {
  loanAmount: 600000,
  deposit: 100000,
  interestRate: 6,
  loanTermYears: 30,
  repaymentFrequency: 'monthly',
  offsetBalance: 0,
  buyerType: 'standard',
  includeLegalFees: true,
  includeBuildingInspection: true,
  splitMemberIds: [],
  splitMode: 'even',
}

beforeEach(() => {
  localStorage.clear()
})

describe('HomePage', () => {
  it('shows an empty-state CTA for mortgage when nothing is configured', async () => {
    render(<HomePage />)
    expect(
      await screen.findByText('Get started with the mortgage calculator.'),
    ).toBeInTheDocument()
  })

  it('shows the mortgage snapshot once loan details are saved', async () => {
    localStorage.setItem('finance-tools-mortgage-inputs', JSON.stringify(savedInputs))
    localStorage.setItem('finance-tools-mortgage-expenses', JSON.stringify([]))
    render(<HomePage />)
    expect(await screen.findByText(/\/mo$/)).toBeInTheDocument()
  })

  it('always shows the budget placeholder', () => {
    render(<HomePage />)
    expect(screen.getByText('Budget Planner')).toBeInTheDocument()
    expect(screen.getByText('Coming soon.')).toBeInTheDocument()
  })

  it('does not show any household-related content', async () => {
    render(<HomePage />)
    await screen.findByText('Get started with the mortgage calculator.')
    expect(screen.queryByText(/household/i)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 8: Run test to verify it fails**

Run: `npx vitest run app/page.test.tsx`
Expected: FAIL — `app/page.tsx` still renders `HouseholdSummaryCard` (until Step 9), and still imports the now-deleted component

- [ ] **Step 9: Rewrite `app/page.tsx`**

```tsx
// app/page.tsx
'use client'

import { MortgageSnapshotCard, BudgetPlaceholderCard, useDashboardData } from '@/components/dashboard'
import { PageContainer } from '@/components/layout'

export default function HomePage() {
  const { mortgageResults } = useDashboardData()

  return (
    <div className="min-h-screen bg-background">
      <main>
        <PageContainer className="py-12">
          <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MortgageSnapshotCard results={mortgageResults} />
            <BudgetPlaceholderCard />
          </div>
        </PageContainer>
      </main>

      <footer className="border-t border-border mt-auto">
        <PageContainer className="py-6">
          <p className="text-sm text-muted text-center">
            Built by{' '}
            <a
              href="https://rafavalerio.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-accent transition-colors"
            >
              Rafael Valerio
            </a>
          </p>
        </PageContainer>
      </footer>
    </div>
  )
}
```

- [ ] **Step 10: Run test to verify it passes**

Run: `npx vitest run app/page.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 11: Commit**

```bash
git add -A components/dashboard app/page.tsx app/page.test.tsx
git commit -m "Remove household tile from dashboard, trim useDashboardData, adopt PageContainer"
```

---

### Task 5: Adopt `PageContainer` in the profile and mortgage pages

**Files:**
- Modify: `app/profile/page.tsx`
- Modify: `app/tools/mortgage/page.tsx`

**Interfaces:**
- Consumes: `PageContainer` from `@/components/layout` (Task 1)

No behavioral change in this task — only the inner width-constrained wrapper `<div>` in each file is replaced with `<PageContainer>`. `PageContainer`'s own unit test (Task 1) already covers the wrapper's rendering/class behavior, so this task's job is to confirm each page's *existing* tests still pass unchanged, not to add new ones.

- [ ] **Step 1: Update `app/profile/page.tsx`**

```tsx
// app/profile/page.tsx
'use client'

import { MemberList, useHousehold } from '@/components/household'
import { PageContainer } from '@/components/layout'

export default function ProfilePage() {
  const { members, addMember, updateMember, removeMember } = useHousehold()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <PageContainer className="py-8">
          <h1 className="text-3xl font-bold text-foreground">Household</h1>
          <p className="text-base text-muted mt-2">
            Add everyone in your household so tools like the mortgage calculator can split costs
            accurately.
          </p>
        </PageContainer>
      </header>
      <main>
        <PageContainer className="py-8">
          <MemberList
            members={members}
            onAdd={addMember}
            onChange={updateMember}
            onRemove={removeMember}
          />
        </PageContainer>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Run the profile page test to confirm no regression**

Run: `npx vitest run app/profile/page.test.tsx`
Expected: PASS (unchanged — 2 tests)

- [ ] **Step 3: Update `app/tools/mortgage/page.tsx`**

```tsx
// app/tools/mortgage/page.tsx
'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import {
  MortgageForm,
  ExpenseList,
  ResultsSummary,
  PurchaseCostsCard,
  ShareModal,
  MortgageLoadingFallback,
  useMortgageCalculator,
} from '@/components/tools/mortgage'
import { AmortisationChart, ExpenseBreakdownChart } from '@/components/charts'
import { HeaderActions, ArrowLeftIcon, ShareIcon, ResetIcon } from '@/components/ui'
import { PageContainer } from '@/components/layout'

function MortgageCalculatorContent() {
  const {
    inputs,
    setInputs,
    expenses,
    setExpenses,
    members,
    showShareModal,
    setShowShareModal,
    shareUrl,
    copied,
    handleReset,
    handleShare,
    handleCopy,
    purchaseCosts,
    results,
    displaySplitBreakdown,
    expenseBreakdownData,
  } = useMortgageCalculator()

  return (
    <>
      {/* Header */}
      <header className="border-b border-border">
        <PageContainer className="py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <Link
                href="/"
                className="mt-1 shrink-0 text-muted hover:text-foreground transition-colors"
              >
                <ArrowLeftIcon width="20" height="20" />
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  Mortgage Calculator
                </h1>
                <p className="text-sm text-muted mt-0.5">
                  Plan your mortgage with Victorian stamp duty and purchase costs
                </p>
              </div>
            </div>

            <HeaderActions
              actions={[
                {
                  key: 'share',
                  label: 'Share',
                  icon: <ShareIcon width="16" height="16" />,
                  onClick: handleShare,
                },
                {
                  key: 'reset',
                  label: 'Reset',
                  icon: <ResetIcon width="16" height="16" />,
                  onClick: handleReset,
                  variant: 'danger',
                },
              ]}
            />
          </div>
        </PageContainer>
      </header>

      {/* Main Content */}
      <main>
        <PageContainer className="py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Inputs */}
            <div className="space-y-6">
              <MortgageForm inputs={inputs} onChange={setInputs} members={members} />
              <PurchaseCostsCard
                costs={purchaseCosts}
                deposit={inputs.deposit}
                propertyPrice={inputs.loanAmount}
              />
              <ExpenseList expenses={expenses} onChange={setExpenses} />
            </div>

            {/* Right Column - Results */}
            <div className="space-y-6">
              <ResultsSummary results={results} splitBreakdown={displaySplitBreakdown} />
              <div className="grid grid-cols-1 gap-6">
                <AmortisationChart data={results?.amortisationSchedule || []} />
                <ExpenseBreakdownChart data={expenseBreakdownData} />
              </div>
            </div>
          </div>
        </PageContainer>
      </main>

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl={shareUrl}
        copied={copied}
        onCopy={handleCopy}
      />
    </>
  )
}

export default function MortgageCalculatorPage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<MortgageLoadingFallback />}>
        <MortgageCalculatorContent />
      </Suspense>
    </div>
  )
}
```

- [ ] **Step 4: Run the mortgage page tests to confirm no regression**

Run: `npx vitest run app/tools/mortgage/page.test.tsx`
Expected: PASS (unchanged — 4 tests)

- [ ] **Step 5: Run the full test suite, lint, and format check**

Run: `npm run test`
Expected: PASS — every test file in the project passes

Run: `npm run lint`
Expected: same single pre-existing documented error as before this plan (no new errors introduced)

Run: `npx prettier --check app/profile/page.tsx app/tools/mortgage/page.tsx`
Expected: clean

- [ ] **Step 6: Commit**

```bash
git add app/profile/page.tsx app/tools/mortgage/page.tsx
git commit -m "Adopt PageContainer in profile and mortgage pages for consistent width"
```

---

## Final verification

- [ ] Run `npm run build` to confirm the production build succeeds.
- [ ] Manually click through: `/` (dashboard shows only Mortgage + Budget cards, same width as nav) → click the profile icon (dropdown shows household summary or empty CTA) → "Manage household" → `/profile` (same 1600px width) → `/tools/mortgage` (same width, no visible shift when navigating between any of these pages).
