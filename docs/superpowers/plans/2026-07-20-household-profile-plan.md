# Household/Profile Layer & Unified App Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the card-grid home page with a persistent top nav + dashboard, add a shared household/member data layer behind a swappable repository, and wire the mortgage calculator's cost split to real household data instead of a hardcoded 50/50 split.

**Architecture:** A new `lib/household/` module exposes household data through a `HouseholdRepository` interface (implemented today by a `LocalStorageHouseholdRepository`), consumed everywhere through a single `useHousehold()` hook. A new `components/layout/TopNav.tsx` persists across all routes via `app/layout.tsx`. The mortgage calculator gains `splitMemberIds`/`splitMode` inputs and a computed `splitBreakdown`, replacing the old `perPersonAmount`. The dashboard (`app/page.tsx`) reads household + saved mortgage data to show live summary cards.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS v4, Vitest + React Testing Library, existing `components/ui/*` primitives.

## Global Constraints

- 100% client-side this round — no backend, no database, no auth. Everything still persists to `localStorage`, exactly like today.
- `HouseholdMember` stays minimal: `{ id, name, income }` — no relationship/type field.
- Household data access MUST go through the `HouseholdRepository` interface, never directly through `localStorage` calls from hooks/components — this is what makes a future database-backed repository a drop-in swap.
- The mortgage "split between" UI only renders when the household has 2+ members — nothing to split otherwise.
- Share links snapshot the split as `{ name, amount }` pairs, never member IDs — a recipient's household is independent of the sender's.
- Follow this repo's Prettier config: single quotes, no semicolons, trailing commas everywhere, printWidth 100, tabWidth 2. Run `npm run format` before each commit.
- Every new or changed file gets a test in the same task, per this repo's existing convention (`CLAUDE.md`).
- Reuse `components/ui/*` primitives (`Input`, `Select`, `Checkbox`, `Button`, `Card`, etc.) — never raw `<input>`/`<button>`. Give every reusable-per-row component an explicit `id` prop (the `ExpenseItem` pattern) to avoid duplicate auto-generated ids.

---

### Task 1: Household member type

**Files:**
- Create: `types/household.ts`

**Interfaces:**
- Produces: `HouseholdMember { id: string; name: string; income: number }`, `SplitMode = 'even' | 'income'` — used by every later task.

- [ ] **Step 1: Write the type file**

```ts
// types/household.ts
export interface HouseholdMember {
  id: string
  name: string
  income: number
}

export type SplitMode = 'even' | 'income'
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors (this file has no consumers yet, so this just checks syntax)

- [ ] **Step 3: Commit**

```bash
git add types/household.ts
git commit -m "Add HouseholdMember and SplitMode types"
```

---

### Task 2: Household repository (interface + localStorage implementation)

**Files:**
- Create: `lib/household/repository.ts`
- Create: `lib/household/localStorageRepository.ts`
- Create: `lib/household/localStorageRepository.test.ts`
- Create: `lib/household/index.ts`

**Interfaces:**
- Consumes: `HouseholdMember` from `@/types/household` (Task 1)
- Produces: `HouseholdRepository` interface, `LocalStorageHouseholdRepository` class, `householdRepository` singleton instance — Task 4's `useHousehold()` hook imports `householdRepository` from `@/lib/household`.

- [ ] **Step 1: Write the repository interface**

```ts
// lib/household/repository.ts
import { HouseholdMember } from '@/types/household'

export interface HouseholdRepository {
  getMembers(): Promise<HouseholdMember[]>
  saveMembers(members: HouseholdMember[]): Promise<void>
}
```

- [ ] **Step 2: Write the failing test for the localStorage implementation**

```ts
// lib/household/localStorageRepository.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { LocalStorageHouseholdRepository } from './localStorageRepository'
import { HouseholdMember } from '@/types/household'

const members: HouseholdMember[] = [
  { id: '1', name: 'Rafael', income: 95000 },
  { id: '2', name: 'Partner', income: 80000 },
]

beforeEach(() => {
  localStorage.clear()
})

describe('LocalStorageHouseholdRepository', () => {
  it('returns an empty array when nothing has been saved', async () => {
    const repo = new LocalStorageHouseholdRepository()
    expect(await repo.getMembers()).toEqual([])
  })

  it('round-trips members through localStorage', async () => {
    const repo = new LocalStorageHouseholdRepository()
    await repo.saveMembers(members)
    expect(await repo.getMembers()).toEqual(members)
  })

  it('returns an empty array if the stored value is corrupt', async () => {
    localStorage.setItem('finance-tools-household', 'not-json')
    const repo = new LocalStorageHouseholdRepository()
    expect(await repo.getMembers()).toEqual([])
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run lib/household/localStorageRepository.test.ts`
Expected: FAIL with "Cannot find module './localStorageRepository'"

- [ ] **Step 4: Write the implementation**

```ts
// lib/household/localStorageRepository.ts
import { HouseholdMember } from '@/types/household'
import { HouseholdRepository } from './repository'

const STORAGE_KEY = 'finance-tools-household'

export class LocalStorageHouseholdRepository implements HouseholdRepository {
  async getMembers(): Promise<HouseholdMember[]> {
    try {
      const json = localStorage.getItem(STORAGE_KEY)
      return json ? JSON.parse(json) : []
    } catch (error) {
      console.error('Failed to load household from localStorage:', error)
      return []
    }
  }

  async saveMembers(members: HouseholdMember[]): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(members))
    } catch (error) {
      console.error('Failed to save household to localStorage:', error)
    }
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run lib/household/localStorageRepository.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Write the module entry point**

```ts
// lib/household/index.ts
import { HouseholdRepository } from './repository'
import { LocalStorageHouseholdRepository } from './localStorageRepository'

export const householdRepository: HouseholdRepository = new LocalStorageHouseholdRepository()
export type { HouseholdRepository }
```

- [ ] **Step 7: Commit**

```bash
git add lib/household/
git commit -m "Add swappable household repository (localStorage-backed for now)"
```

---

### Task 3: Household split calculation

**Files:**
- Create: `lib/calculations/household.ts`
- Create: `lib/calculations/household.test.ts`

**Interfaces:**
- Consumes: `HouseholdMember`, `SplitMode` from `@/types/household` (Task 1)
- Produces: `computeSplit(members, mode): Record<string, number>` and `formatCompactIncome(amount): string` — Task 8 (`calculateMortgageResults`) and Task 16 (dashboard household card) import these.

- [ ] **Step 1: Write the failing tests**

```ts
// lib/calculations/household.test.ts
import { describe, it, expect } from 'vitest'
import { computeSplit, formatCompactIncome } from './household'
import { HouseholdMember } from '@/types/household'

describe('computeSplit', () => {
  it('returns an empty object for no members', () => {
    expect(computeSplit([], 'even')).toEqual({})
  })

  it('gives a single member the full share', () => {
    const members: HouseholdMember[] = [{ id: 'a', name: 'Alex', income: 100000 }]
    expect(computeSplit(members, 'even')).toEqual({ a: 1 })
  })

  it('splits evenly across members when mode is even', () => {
    const members: HouseholdMember[] = [
      { id: 'a', name: 'Alex', income: 100000 },
      { id: 'b', name: 'Sam', income: 50000 },
      { id: 'c', name: 'Jo', income: 0 },
    ]
    const result = computeSplit(members, 'even')
    expect(result.a).toBeCloseTo(1 / 3)
    expect(result.b).toBeCloseTo(1 / 3)
    expect(result.c).toBeCloseTo(1 / 3)
  })

  it('splits proportional to income when mode is income and all incomes are positive', () => {
    const members: HouseholdMember[] = [
      { id: 'a', name: 'Alex', income: 100000 },
      { id: 'b', name: 'Sam', income: 50000 },
    ]
    const result = computeSplit(members, 'income')
    expect(result.a).toBeCloseTo(2 / 3)
    expect(result.b).toBeCloseTo(1 / 3)
  })

  it('falls back to even split when any included member has no income', () => {
    const members: HouseholdMember[] = [
      { id: 'a', name: 'Alex', income: 100000 },
      { id: 'b', name: 'Sam', income: 0 },
    ]
    const result = computeSplit(members, 'income')
    expect(result.a).toBeCloseTo(0.5)
    expect(result.b).toBeCloseTo(0.5)
  })
})

describe('formatCompactIncome', () => {
  it('formats amounts of 1000 or more in thousands with a lowercase k', () => {
    expect(formatCompactIncome(175000)).toBe('$175k')
    expect(formatCompactIncome(1000)).toBe('$1k')
  })

  it('formats amounts under 1000 as a plain dollar figure', () => {
    expect(formatCompactIncome(500)).toBe('$500')
    expect(formatCompactIncome(0)).toBe('$0')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/calculations/household.test.ts`
Expected: FAIL with "Cannot find module './household'"

- [ ] **Step 3: Write the implementation**

```ts
// lib/calculations/household.ts
import { HouseholdMember, SplitMode } from '@/types/household'

/**
 * Compute each member's share (0-1) of a shared cost.
 * Income-weighted mode falls back to an even split if any member's income is not positive.
 */
export function computeSplit(members: HouseholdMember[], mode: SplitMode): Record<string, number> {
  if (members.length === 0) return {}

  const useIncome = mode === 'income' && members.every((member) => member.income > 0)

  if (!useIncome) {
    const ratio = 1 / members.length
    return Object.fromEntries(members.map((member) => [member.id, ratio]))
  }

  const totalIncome = members.reduce((sum, member) => sum + member.income, 0)
  return Object.fromEntries(members.map((member) => [member.id, member.income / totalIncome]))
}

/**
 * Compact currency formatting for dashboard summary tiles (e.g. "$175k").
 */
export function formatCompactIncome(amount: number): string {
  if (amount >= 1000) {
    return `$${Math.round(amount / 1000)}k`
  }
  return `$${Math.round(amount)}`
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/calculations/household.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/calculations/household.ts lib/calculations/household.test.ts
git commit -m "Add household cost-split calculation"
```

---

### Task 4: `useHousehold()` hook

**Files:**
- Create: `components/household/useHousehold.ts`
- Create: `components/household/useHousehold.test.ts`

**Interfaces:**
- Consumes: `householdRepository` from `@/lib/household` (Task 2), `HouseholdMember` from `@/types/household` (Task 1)
- Produces: `useHousehold(): { members: HouseholdMember[]; isLoaded: boolean; addMember(): void; updateMember(member: HouseholdMember): void; removeMember(id: string): void }` — consumed by Task 5 (`MemberList`/`MemberItem`), Task 6 (`/profile`), Task 11 (`useMortgageCalculator`), Task 15 (`useDashboardData`).

- [ ] **Step 1: Write the failing tests**

```ts
// components/household/useHousehold.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useHousehold } from './useHousehold'

beforeEach(() => {
  localStorage.clear()
})

describe('useHousehold', () => {
  it('starts empty and loaded is false until localStorage has been read', async () => {
    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.members).toEqual([])
  })

  it('loads saved members from localStorage on mount', async () => {
    localStorage.setItem(
      'finance-tools-household',
      JSON.stringify([{ id: '1', name: 'Rafael', income: 95000 }]),
    )
    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.members).toHaveLength(1))
    expect(result.current.members[0].name).toBe('Rafael')
  })

  it('appends a blank member when addMember is called', async () => {
    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    act(() => {
      result.current.addMember()
    })

    expect(result.current.members).toHaveLength(1)
    expect(result.current.members[0]).toMatchObject({ name: '', income: 0 })
  })

  it('updates a member by id', async () => {
    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    act(() => {
      result.current.addMember()
    })
    const added = result.current.members[0]

    act(() => {
      result.current.updateMember({ ...added, name: 'Rafael', income: 95000 })
    })

    expect(result.current.members[0]).toEqual({ ...added, name: 'Rafael', income: 95000 })
  })

  it('removes a member by id', async () => {
    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    act(() => {
      result.current.addMember()
    })
    const added = result.current.members[0]

    act(() => {
      result.current.removeMember(added.id)
    })

    expect(result.current.members).toEqual([])
  })

  it('persists changes to localStorage', async () => {
    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    act(() => {
      result.current.addMember()
    })

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('finance-tools-household') || '[]')
      expect(stored).toHaveLength(1)
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run components/household/useHousehold.test.ts`
Expected: FAIL with "Cannot find module './useHousehold'"

- [ ] **Step 3: Write the implementation**

```ts
// components/household/useHousehold.ts
'use client'

import { useCallback, useEffect, useState } from 'react'
import { HouseholdMember } from '@/types/household'
import { householdRepository } from '@/lib/household'

export function useHousehold() {
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from the repository on mount
  useEffect(() => {
    let cancelled = false
    householdRepository.getMembers().then((loaded) => {
      if (!cancelled) {
        setMembers(loaded)
        setIsLoaded(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Persist to the repository whenever members change, once loaded
  useEffect(() => {
    if (isLoaded) {
      householdRepository.saveMembers(members)
    }
  }, [members, isLoaded])

  const addMember = useCallback(() => {
    setMembers((current) => [...current, { id: crypto.randomUUID(), name: '', income: 0 }])
  }, [])

  const updateMember = useCallback((updated: HouseholdMember) => {
    setMembers((current) =>
      current.map((member) => (member.id === updated.id ? updated : member)),
    )
  }, [])

  const removeMember = useCallback((id: string) => {
    setMembers((current) => current.filter((member) => member.id !== id))
  }, [])

  return { members, isLoaded, addMember, updateMember, removeMember }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run components/household/useHousehold.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add components/household/useHousehold.ts components/household/useHousehold.test.ts
git commit -m "Add useHousehold hook"
```

---

### Task 5: Household member editor components

**Files:**
- Create: `components/household/MemberItem.tsx`
- Create: `components/household/MemberItem.test.tsx`
- Create: `components/household/MemberList.tsx`
- Create: `components/household/MemberList.test.tsx`
- Create: `components/household/index.ts`

**Interfaces:**
- Consumes: `HouseholdMember` from `@/types/household` (Task 1), `useHousehold` from `./useHousehold` (Task 4), `Input`/`Button`/`TrashIcon`/`Card`/`CardHeader`/`CardTitle`/`CardContent`/`PlusIcon`/`WalletIcon` from `@/components/ui`
- Produces: `MemberItem`, `MemberList` — consumed by Task 6 (`/profile` page). `components/household/index.ts` barrel-exports `MemberItem`, `MemberList`, `useHousehold`.

- [ ] **Step 1: Write the failing test for `MemberItem`**

```tsx
// components/household/MemberItem.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemberItem } from './MemberItem'
import { HouseholdMember } from '@/types/household'

const member: HouseholdMember = { id: '1', name: 'Rafael', income: 95000 }

describe('MemberItem', () => {
  it('renders the member fields', () => {
    render(<MemberItem member={member} onChange={() => {}} onRemove={() => {}} />)
    expect(screen.getByLabelText('Name')).toHaveValue('Rafael')
    expect(screen.getByLabelText('Annual Income')).toHaveValue(95000)
  })

  it('calls onChange with the updated name', async () => {
    const onChange = vi.fn()
    render(<MemberItem member={member} onChange={onChange} onRemove={() => {}} />)
    await userEvent.type(screen.getByLabelText('Name'), '!')
    expect(onChange).toHaveBeenCalledWith({ ...member, name: 'Rafael!' })
  })

  it('calls onRemove when the remove button is clicked', async () => {
    const onRemove = vi.fn()
    render(<MemberItem member={member} onChange={() => {}} onRemove={onRemove} />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove member' }))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('scopes field ids to the member id so multiple rows do not collide', () => {
    render(<MemberItem member={member} onChange={() => {}} onRemove={() => {}} />)
    expect(screen.getByLabelText('Name')).toHaveAttribute('id', 'member-name-1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/household/MemberItem.test.tsx`
Expected: FAIL with "Cannot find module './MemberItem'"

- [ ] **Step 3: Write the `MemberItem` implementation**

```tsx
// components/household/MemberItem.tsx
'use client'

import { Input, Button, TrashIcon } from '@/components/ui'
import { HouseholdMember } from '@/types/household'

interface MemberItemProps {
  member: HouseholdMember
  onChange: (member: HouseholdMember) => void
  onRemove: () => void
}

export function MemberItem({ member, onChange, onRemove }: MemberItemProps) {
  const handleChange = (field: keyof HouseholdMember, value: string | number) => {
    onChange({ ...member, [field]: value })
  }

  return (
    <div
      className={`
        flex flex-col sm:flex-row gap-3 items-start sm:items-end
        p-4 bg-background rounded-lg border border-border
      `}
    >
      <div className="flex-1 w-full sm:w-auto">
        <Input
          id={`member-name-${member.id}`}
          label="Name"
          type="text"
          placeholder="e.g., Rafael"
          value={member.name}
          onChange={(e) => handleChange('name', e.target.value)}
        />
      </div>
      <div className="w-full sm:w-48">
        <Input
          id={`member-income-${member.id}`}
          label="Annual Income"
          type="number"
          prefix="$"
          placeholder="95000"
          value={member.income || ''}
          onChange={(e) => handleChange('income', parseFloat(e.target.value) || 0)}
        />
      </div>
      <Button
        variant="ghost"
        size="md"
        onClick={onRemove}
        className="text-red-400 hover:text-red-300 hover:bg-red-400/10 mt-2 sm:mt-0"
        aria-label="Remove member"
      >
        <TrashIcon width="20" height="20" />
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/household/MemberItem.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Write the failing test for `MemberList`**

```tsx
// components/household/MemberList.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemberList } from './MemberList'
import { HouseholdMember } from '@/types/household'

describe('MemberList', () => {
  it('shows an empty state when there are no members', () => {
    render(<MemberList members={[]} onAdd={() => {}} onChange={() => {}} onRemove={() => {}} />)
    expect(screen.getByText('No household members added yet.')).toBeInTheDocument()
  })

  it('renders one row per member', () => {
    const members: HouseholdMember[] = [
      { id: '1', name: 'Rafael', income: 95000 },
      { id: '2', name: 'Partner', income: 80000 },
    ]
    render(
      <MemberList members={members} onAdd={() => {}} onChange={() => {}} onRemove={() => {}} />,
    )
    expect(screen.getAllByLabelText('Name')).toHaveLength(2)
  })

  it('calls onAdd when "Add member" is clicked', async () => {
    const onAdd = vi.fn()
    render(<MemberList members={[]} onAdd={onAdd} onChange={() => {}} onRemove={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Add member' }))
    expect(onAdd).toHaveBeenCalledTimes(1)
  })

  it('calls onRemove with the member id when its remove button is clicked', async () => {
    const onRemove = vi.fn()
    const members: HouseholdMember[] = [{ id: '1', name: 'Rafael', income: 95000 }]
    render(
      <MemberList members={members} onAdd={() => {}} onChange={() => {}} onRemove={onRemove} />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Remove member' }))
    expect(onRemove).toHaveBeenCalledWith('1')
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run components/household/MemberList.test.tsx`
Expected: FAIL with "Cannot find module './MemberList'"

- [ ] **Step 7: Write the `MemberList` implementation**

```tsx
// components/household/MemberList.tsx
'use client'

import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  PlusIcon,
  WalletIcon,
} from '@/components/ui'
import { HouseholdMember } from '@/types/household'
import { MemberItem } from './MemberItem'

interface MemberListProps {
  members: HouseholdMember[]
  onAdd: () => void
  onChange: (member: HouseholdMember) => void
  onRemove: (id: string) => void
}

export function MemberList({ members, onAdd, onChange, onRemove }: MemberListProps) {
  return (
    <Card>
      <CardHeader
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={onAdd}
            aria-label="Add member"
            title="Add member"
          >
            <PlusIcon width="16" height="16" />
          </Button>
        }
      >
        <CardTitle className="flex items-center gap-2">
          <WalletIcon width="20" height="20" className="text-accent" />
          Household Members
        </CardTitle>
        <p className="text-sm text-muted mt-1">
          Add everyone whose income should count toward shared costs.
        </p>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="text-center py-8 text-muted">
            <p>No household members added yet.</p>
            <p className="text-sm mt-1">Click &ldquo;Add Member&rdquo; to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <MemberItem
                key={member.id}
                member={member}
                onChange={onChange}
                onRemove={() => onRemove(member.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run components/household/MemberList.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 9: Write the barrel export**

```ts
// components/household/index.ts
export { MemberItem } from './MemberItem'
export { MemberList } from './MemberList'
export { useHousehold } from './useHousehold'
```

- [ ] **Step 10: Commit**

```bash
git add components/household/
git commit -m "Add household member editor components"
```

---

### Task 6: Profile page

**Files:**
- Create: `app/profile/page.tsx`
- Create: `app/profile/page.test.tsx`

**Interfaces:**
- Consumes: `MemberList`, `useHousehold` from `@/components/household` (Tasks 4-5)

- [ ] **Step 1: Write the failing test**

```tsx
// app/profile/page.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProfilePage from './page'

beforeEach(() => {
  localStorage.clear()
})

describe('ProfilePage', () => {
  it('shows an empty state with no members', async () => {
    render(<ProfilePage />)
    expect(await screen.findByText('No household members added yet.')).toBeInTheDocument()
  })

  it('adds a member and lets it be edited', async () => {
    render(<ProfilePage />)
    await screen.findByText('No household members added yet.')

    await userEvent.click(screen.getByRole('button', { name: 'Add member' }))
    await userEvent.type(screen.getByLabelText('Name'), 'Rafael')
    await userEvent.type(screen.getByLabelText('Annual Income'), '95000')

    expect(screen.getByLabelText('Name')).toHaveValue('Rafael')
    expect(screen.getByLabelText('Annual Income')).toHaveValue(95000)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/profile/page.test.tsx`
Expected: FAIL with "Cannot find module './page'"

- [ ] **Step 3: Write the implementation**

```tsx
// app/profile/page.tsx
'use client'

import { MemberList, useHousehold } from '@/components/household'

export default function ProfilePage() {
  const { members, addMember, updateMember, removeMember } = useHousehold()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-foreground">Household</h1>
          <p className="text-base text-muted mt-2">
            Add everyone in your household so tools like the mortgage calculator can split costs
            accurately.
          </p>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MemberList
          members={members}
          onAdd={addMember}
          onChange={updateMember}
          onRemove={removeMember}
        />
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/profile/page.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add app/profile/
git commit -m "Add /profile household editor page"
```

---

### Task 7: Top nav shell

**Files:**
- Create: `components/layout/TopNav.tsx`
- Create: `components/layout/TopNav.test.tsx`
- Create: `components/layout/index.ts`
- Modify: `app/layout.tsx`
- Modify: `app/layout.test.tsx`

**Interfaces:**
- Produces: `TopNav` component, rendered globally by `app/layout.tsx` — no other task depends on its exports directly.

- [ ] **Step 1: Write the failing test for `TopNav`**

```tsx
// components/layout/TopNav.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TopNav } from './TopNav'

const mockUsePathname = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

describe('TopNav', () => {
  it('renders a link to each tool', () => {
    mockUsePathname.mockReturnValue('/')
    render(<TopNav />)
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile')
    expect(screen.getByRole('link', { name: 'Mortgage' })).toHaveAttribute(
      'href',
      '/tools/mortgage',
    )
  })

  it('shows the budget link as disabled, not a link', () => {
    mockUsePathname.mockReturnValue('/')
    render(<TopNav />)
    expect(screen.queryByRole('link', { name: /budget/i })).not.toBeInTheDocument()
    expect(screen.getAllByText(/budget/i).length).toBeGreaterThan(0)
  })

  it('opens and closes the mobile menu', async () => {
    mockUsePathname.mockReturnValue('/')
    render(<TopNav />)

    const toggle = screen.getByRole('button', { name: 'Open navigation menu' })
    await userEvent.click(toggle)
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/layout/TopNav.test.tsx`
Expected: FAIL with "Cannot find module './TopNav'"

- [ ] **Step 3: Write the implementation**

```tsx
// components/layout/TopNav.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { WalletIcon, MoreIcon } from '@/components/ui'

interface NavLink {
  key: string
  label: string
  href: string
  disabled?: boolean
}

const NAV_LINKS: NavLink[] = [
  { key: 'profile', label: 'Profile', href: '/profile' },
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
    return pathname === link.href ? 'text-accent' : 'text-muted hover:text-foreground transition-colors'
  }

  return (
    <nav className="border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-foreground shrink-0">
          <WalletIcon width="20" height="20" className="text-accent" />
          Finance Tools
        </Link>

        {/* Inline links from sm: up */}
        <div className="hidden sm:flex items-center gap-6 text-sm font-medium">
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

        {/* Collapsed menu below sm: */}
        <div className="relative shrink-0 sm:hidden" ref={menuRef}>
          <button
            onClick={() => setOpen((isOpen) => !isOpen)}
            aria-label="Open navigation menu"
            aria-haspopup="menu"
            aria-expanded={open}
            className="p-2 text-muted hover:text-foreground transition-colors"
          >
            <MoreIcon width="20" height="20" />
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 top-full z-10 mt-2 w-44 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
            >
              {NAV_LINKS.map((link) =>
                link.disabled ? (
                  <span
                    key={link.key}
                    className="block px-4 py-2.5 text-sm text-muted/50 cursor-not-allowed"
                  >
                    {link.label} (soon)
                  </span>
                ) : (
                  <Link
                    key={link.key}
                    href={link.href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className={`block px-4 py-2.5 text-sm hover:bg-border transition-colors ${
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
    </nav>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/layout/TopNav.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the barrel export**

```ts
// components/layout/index.ts
export { TopNav } from './TopNav'
```

- [ ] **Step 6: Update `app/layout.test.tsx` to mock `next/navigation` and check for the nav**

```tsx
// app/layout.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: '--font-geist-sans' }),
  Geist_Mono: () => ({ variable: '--font-geist-mono' }),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

const { default: RootLayout, metadata } = await import('./layout')

describe('RootLayout', () => {
  it('renders its children', () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <p>Page content</p>
      </RootLayout>,
    )
    expect(html).toContain('Page content')
    expect(html).toContain('lang="en"')
  })

  it('renders the persistent top nav', () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <p>Page content</p>
      </RootLayout>,
    )
    expect(html).toContain('Finance Tools')
    expect(html).toContain('/profile')
  })

  it('sets the page metadata', () => {
    expect(metadata.title).toBe('Finance Tools')
    expect(metadata.description).toBe(
      'Personal finance tools for budgeting, mortgage planning, and more',
    )
  })
})
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npx vitest run app/layout.test.tsx`
Expected: FAIL — "renders the persistent top nav" fails because `TopNav` is not yet rendered by `RootLayout`

- [ ] **Step 8: Wire `TopNav` into `app/layout.tsx`**

```tsx
// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { TopNav } from '@/components/layout'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Finance Tools',
  description: 'Personal finance tools for budgeting, mortgage planning, and more',
  appleWebApp: {
    capable: true,
    title: 'Finance Tools',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  themeColor: '#d97757',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
        <TopNav />
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npx vitest run app/layout.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 10: Commit**

```bash
git add components/layout/ app/layout.tsx app/layout.test.tsx
git commit -m "Add persistent top nav shell"
```

---

### Task 8: Mortgage types + split-aware calculation

**Files:**
- Modify: `types/mortgage.ts`
- Modify: `lib/calculations/mortgage.ts`
- Modify: `lib/calculations/mortgage.test.ts`

**Interfaces:**
- Consumes: `HouseholdMember` from `@/types/household` (Task 1), `computeSplit` from `@/lib/calculations/household` (Task 3)
- Produces: `MortgageInputs.splitMemberIds: string[]`, `MortgageInputs.splitMode: SplitMode`, `MemberSplitAmount { memberId, name, amount }`, `SplitSnapshotEntry { name, amount }`, `MortgageResults.splitBreakdown: MemberSplitAmount[]` (replaces `perPersonAmount`), `calculateMortgageResults(inputs, expenses, members)` — the new `members` parameter and `splitBreakdown` field are consumed by Task 9 (`lib/storage.ts`), Task 10 (`useMortgageCalculator`), Task 12 (`ResultsSummary`).

- [ ] **Step 1: Update `types/mortgage.ts`**

```ts
// types/mortgage.ts
import { SplitMode } from '@/types/household'

export type RepaymentFrequency = 'weekly' | 'fortnightly' | 'monthly'

export type ExpenseFrequency = 'monthly' | 'quarterly' | 'annually'

export type BuyerType = 'standard' | 'first_home_buyer' | 'foreign_buyer'

export interface MortgageInputs {
  loanAmount: number
  deposit: number
  interestRate: number
  loanTermYears: number
  repaymentFrequency: RepaymentFrequency
  offsetBalance: number
  buyerType: BuyerType
  includeLegalFees: boolean
  includeBuildingInspection: boolean
  splitMemberIds: string[]
  splitMode: SplitMode
}

export interface PurchaseCosts {
  stampDuty: number
  stampDutyDescription: string
  legalFees: number
  titleRegistration: number
  buildingInspection: number
  mortgageRegistration: number
  totalCosts: number
  effectiveDeposit: number
  depositPercentage: number
  requiresLMI: boolean
  estimatedLMI: number
}

export interface Expense {
  id: string
  name: string
  amount: number
  frequency: ExpenseFrequency
}

export interface AmortisationDataPoint {
  period: number
  date: string
  balance: number
  principal: number
  interest: number
  payment: number
}

export interface MemberSplitAmount {
  memberId: string
  name: string
  amount: number
}

export interface SplitSnapshotEntry {
  name: string
  amount: number
}

export interface MortgageResults {
  // Loan details
  principalAmount: number
  repaymentAmount: number
  repaymentFrequency: RepaymentFrequency
  totalRepayments: number
  totalInterest: number
  payoffDate: Date

  // Monthly equivalents
  monthlyMortgagePayment: number
  monthlyExpensesTotal: number
  totalMonthlyOutgoing: number
  splitBreakdown: MemberSplitAmount[]

  // Amortisation schedule
  amortisationSchedule: AmortisationDataPoint[]
}

export interface ExpenseBreakdownItem {
  name: string
  value: number
  color: string
}
```

- [ ] **Step 2: Update the failing test in `lib/calculations/mortgage.test.ts`**

Replace the `calculateMortgageResults` describe block and the `baseInputs` fixture:

```ts
// lib/calculations/mortgage.test.ts (relevant section — replace baseInputs and the calculateMortgageResults describe block)
import { HouseholdMember } from '@/types/household'

// ...

describe('calculateMortgageResults', () => {
  const baseInputs: MortgageInputs = {
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

  it('derives principal as loan amount minus deposit', () => {
    const results = calculateMortgageResults(baseInputs, [], [])
    expect(results.principalAmount).toBe(500000)
  })

  it('reduces the effective principal by the offset balance', () => {
    const withOffset = calculateMortgageResults(
      { ...baseInputs, offsetBalance: 50000 },
      [],
      [],
    )
    const withoutOffset = calculateMortgageResults(baseInputs, [], [])
    expect(withOffset.repaymentAmount).toBeLessThan(withoutOffset.repaymentAmount)
  })

  it('sums monthly expenses onto the mortgage payment', () => {
    const expenses: Expense[] = [
      { id: '1', name: 'Rates', amount: 300, frequency: 'quarterly' },
      { id: '2', name: 'Insurance', amount: 1200, frequency: 'annually' },
    ]
    const results = calculateMortgageResults(baseInputs, expenses, [])

    expect(results.monthlyExpensesTotal).toBeCloseTo(100 + 100)
    expect(results.totalMonthlyOutgoing).toBeCloseTo(
      results.monthlyMortgagePayment + results.monthlyExpensesTotal,
    )
  })

  it('produces no split breakdown when fewer than two members are selected', () => {
    const members: HouseholdMember[] = [{ id: 'a', name: 'Alex', income: 100000 }]
    const results = calculateMortgageResults(
      { ...baseInputs, splitMemberIds: ['a'] },
      [],
      members,
    )
    expect(results.splitBreakdown).toEqual([])
  })

  it('splits the total monthly outgoing evenly across selected members', () => {
    const members: HouseholdMember[] = [
      { id: 'a', name: 'Alex', income: 100000 },
      { id: 'b', name: 'Sam', income: 50000 },
    ]
    const results = calculateMortgageResults(
      { ...baseInputs, splitMemberIds: ['a', 'b'], splitMode: 'even' },
      [],
      members,
    )
    expect(results.splitBreakdown).toHaveLength(2)
    expect(results.splitBreakdown[0].amount).toBeCloseTo(results.totalMonthlyOutgoing / 2)
    expect(results.splitBreakdown[1].amount).toBeCloseTo(results.totalMonthlyOutgoing / 2)
  })

  it('splits the total monthly outgoing by income when mode is income', () => {
    const members: HouseholdMember[] = [
      { id: 'a', name: 'Alex', income: 100000 },
      { id: 'b', name: 'Sam', income: 50000 },
    ]
    const results = calculateMortgageResults(
      { ...baseInputs, splitMemberIds: ['a', 'b'], splitMode: 'income' },
      [],
      members,
    )
    const alex = results.splitBreakdown.find((entry) => entry.memberId === 'a')!
    const sam = results.splitBreakdown.find((entry) => entry.memberId === 'b')!
    expect(alex.amount).toBeCloseTo(results.totalMonthlyOutgoing * (2 / 3))
    expect(sam.amount).toBeCloseTo(results.totalMonthlyOutgoing * (1 / 3))
  })

  it('produces an amortisation schedule', () => {
    const results = calculateMortgageResults(baseInputs, [], [])
    expect(results.amortisationSchedule.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run lib/calculations/mortgage.test.ts`
Expected: FAIL — `calculateMortgageResults` is called with 3 arguments but only accepts 2; `perPersonAmount` references are gone

- [ ] **Step 4: Update `calculateMortgageResults` in `lib/calculations/mortgage.ts`**

```ts
// lib/calculations/mortgage.ts — update the import and the function (lines 1-10 and 133-201 in the original file)
import {
  MortgageInputs,
  MortgageResults,
  Expense,
  ExpenseFrequency,
  RepaymentFrequency,
  AmortisationDataPoint,
  BuyerType,
  PurchaseCosts,
  MemberSplitAmount,
} from '@/types/mortgage'
import { HouseholdMember } from '@/types/household'
import { computeSplit } from './household'

// ... getRepaymentsPerYear, convertToMonthly, convertRepaymentToMonthly, calculateRepayment,
// generateAmortisationSchedule stay unchanged ...

/**
 * Calculate all mortgage results
 */
export function calculateMortgageResults(
  inputs: MortgageInputs,
  expenses: Expense[],
  members: HouseholdMember[],
): MortgageResults {
  // Calculate principal (loan amount minus deposit)
  const principalAmount = inputs.loanAmount - inputs.deposit

  // Effective principal considering offset
  const effectivePrincipal = Math.max(0, principalAmount - inputs.offsetBalance)

  // Calculate repayment amount
  const repaymentAmount = calculateRepayment(
    effectivePrincipal,
    inputs.interestRate,
    inputs.loanTermYears,
    inputs.repaymentFrequency,
  )

  // Calculate total repayments and interest
  const periodsPerYear = getRepaymentsPerYear(inputs.repaymentFrequency)
  const totalPayments = inputs.loanTermYears * periodsPerYear
  const totalRepayments = repaymentAmount * totalPayments
  const totalInterest = totalRepayments - effectivePrincipal

  // Calculate payoff date
  const payoffDate = new Date()
  payoffDate.setFullYear(payoffDate.getFullYear() + inputs.loanTermYears)

  // Convert mortgage repayment to monthly equivalent
  const monthlyMortgagePayment = convertRepaymentToMonthly(
    repaymentAmount,
    inputs.repaymentFrequency,
  )

  // Calculate monthly expenses total
  const monthlyExpensesTotal = expenses.reduce((total, expense) => {
    return total + convertToMonthly(expense.amount, expense.frequency)
  }, 0)

  // Calculate totals
  const totalMonthlyOutgoing = monthlyMortgagePayment + monthlyExpensesTotal

  // Split the total across the selected household members (empty if fewer than 2)
  const splitMembers = members.filter((member) => inputs.splitMemberIds.includes(member.id))
  let splitBreakdown: MemberSplitAmount[] = []
  if (splitMembers.length >= 2) {
    const ratios = computeSplit(splitMembers, inputs.splitMode)
    splitBreakdown = splitMembers.map((member) => ({
      memberId: member.id,
      name: member.name,
      amount: totalMonthlyOutgoing * ratios[member.id],
    }))
  }

  // Generate amortisation schedule
  const amortisationSchedule = generateAmortisationSchedule(
    effectivePrincipal,
    inputs.interestRate,
    inputs.loanTermYears,
    inputs.repaymentFrequency,
    repaymentAmount,
  )

  return {
    principalAmount,
    repaymentAmount,
    repaymentFrequency: inputs.repaymentFrequency,
    totalRepayments,
    totalInterest,
    payoffDate,
    monthlyMortgagePayment,
    monthlyExpensesTotal,
    totalMonthlyOutgoing,
    splitBreakdown,
    amortisationSchedule,
  }
}

// ... formatCurrency, formatCurrencyPrecise, formatFrequencyLabel, calculateVictorianStampDuty,
// calculateStandardDuty, estimateLMI, calculatePurchaseCosts stay unchanged ...
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run lib/calculations/mortgage.test.ts`
Expected: PASS (all tests, including the 4 new split-related ones)

- [ ] **Step 6: Commit**

```bash
git add types/mortgage.ts lib/calculations/mortgage.ts lib/calculations/mortgage.test.ts
git commit -m "Replace hardcoded 50/50 mortgage split with household-aware split calculation"
```

---

### Task 9: Storage — split fields + share snapshot

**Files:**
- Modify: `lib/storage.ts`
- Modify: `lib/storage.test.ts`

**Interfaces:**
- Consumes: `SplitSnapshotEntry` from `@/types/mortgage` (Task 8)
- Produces: `encodeMortgageData(data, splitSnapshot?)`, `decodeMortgageData(encoded): DecodedMortgageData | null` where `DecodedMortgageData extends MortgageStorageData { splitSnapshot: SplitSnapshotEntry[] | null }`, `generateShareUrl(data, splitSnapshot?)` — consumed by Task 10 (`useMortgageCalculator`).

- [ ] **Step 1: Update the failing tests in `lib/storage.test.ts`**

```ts
// lib/storage.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveMortgageData,
  loadMortgageData,
  clearMortgageData,
  encodeMortgageData,
  decodeMortgageData,
  generateShareUrl,
  MortgageStorageData,
} from './storage'
import { MortgageInputs } from '@/types/mortgage'

const defaultInputs: MortgageInputs = {
  loanAmount: 0,
  deposit: 0,
  interestRate: 0,
  loanTermYears: 30,
  repaymentFrequency: 'monthly',
  offsetBalance: 0,
  buyerType: 'standard',
  includeLegalFees: true,
  includeBuildingInspection: true,
  splitMemberIds: [],
  splitMode: 'even',
}

const customData: MortgageStorageData = {
  inputs: {
    loanAmount: 650000,
    deposit: 120000,
    interestRate: 6.25,
    loanTermYears: 25,
    repaymentFrequency: 'fortnightly',
    offsetBalance: 15000,
    buyerType: 'first_home_buyer',
    includeLegalFees: false,
    includeBuildingInspection: false,
    splitMemberIds: ['a', 'b'],
    splitMode: 'income',
  },
  expenses: [
    { id: '1', name: 'Council Rates', amount: 400, frequency: 'quarterly' },
    { id: '2', name: 'Home Insurance', amount: 1500, frequency: 'annually' },
  ],
}

beforeEach(() => {
  localStorage.clear()
})

describe('saveMortgageData / loadMortgageData', () => {
  it('returns null when nothing has been saved', () => {
    expect(loadMortgageData()).toBeNull()
  })

  it('round-trips inputs and expenses through localStorage, including split settings', () => {
    saveMortgageData(customData)
    expect(loadMortgageData()).toEqual(customData)
  })

  it('defaults expenses to an empty array if none were saved', () => {
    localStorage.setItem('finance-tools-mortgage-inputs', JSON.stringify(defaultInputs))
    expect(loadMortgageData()).toEqual({ inputs: defaultInputs, expenses: [] })
  })
})

describe('clearMortgageData', () => {
  it('removes saved inputs and expenses', () => {
    saveMortgageData(customData)
    clearMortgageData()
    expect(loadMortgageData()).toBeNull()
  })
})

describe('encodeMortgageData / decodeMortgageData', () => {
  it('round-trips custom inputs and expenses, but not splitMemberIds/splitMode (local-only)', () => {
    const encoded = encodeMortgageData(customData)
    const decoded = decodeMortgageData(encoded)

    expect(decoded).not.toBeNull()
    expect(decoded!.inputs).toEqual({ ...customData.inputs, splitMemberIds: [], splitMode: 'even' })
    expect(decoded!.expenses).toHaveLength(2)
    expect(decoded!.expenses[0]).toMatchObject({
      name: 'Council Rates',
      amount: 400,
      frequency: 'quarterly',
    })
    expect(decoded!.splitSnapshot).toBeNull()
  })

  it('embeds and decodes a split snapshot by name and amount', () => {
    const snapshot = [
      { name: 'Rafael', amount: 1200 },
      { name: 'Partner', amount: 1140 },
    ]
    const encoded = encodeMortgageData(customData, snapshot)
    const decoded = decodeMortgageData(encoded)

    expect(decoded!.splitSnapshot).toEqual(snapshot)
  })

  it('produces a URL-safe string with no base64 padding or unsafe characters', () => {
    const encoded = encodeMortgageData(customData)
    expect(encoded).not.toMatch(/[+/=]/)
  })

  it('decodes to the defaults when every field is default (nothing encoded)', () => {
    const encoded = encodeMortgageData({ inputs: defaultInputs, expenses: [] })
    const decoded = decodeMortgageData(encoded)
    expect(decoded).toEqual({ inputs: defaultInputs, expenses: [], splitSnapshot: null })
  })

  it('omits expenses with no name or non-positive amount', () => {
    const encoded = encodeMortgageData({
      inputs: defaultInputs,
      expenses: [
        { id: '1', name: '', amount: 100, frequency: 'monthly' },
        { id: '2', name: 'Empty', amount: 0, frequency: 'monthly' },
        { id: '3', name: 'Valid', amount: 50, frequency: 'monthly' },
      ],
    })
    const decoded = decodeMortgageData(encoded)
    expect(decoded!.expenses).toHaveLength(1)
    expect(decoded!.expenses[0].name).toBe('Valid')
  })

  it('returns null for invalid encoded input', () => {
    expect(decodeMortgageData('not-valid-base64!!')).toBeNull()
  })
})

describe('generateShareUrl', () => {
  it('builds a URL pointing at the mortgage tool with encoded data', () => {
    const url = generateShareUrl(customData)
    expect(url).toContain('/tools/mortgage?data=')

    const encoded = url.split('?data=')[1]
    const decoded = decodeMortgageData(encoded)
    expect(decoded!.inputs).toEqual({ ...customData.inputs, splitMemberIds: [], splitMode: 'even' })
  })

  it('includes a split snapshot when one is provided', () => {
    const snapshot = [{ name: 'Rafael', amount: 1200 }]
    const url = generateShareUrl(customData, snapshot)
    const encoded = url.split('?data=')[1]
    const decoded = decodeMortgageData(encoded)
    expect(decoded!.splitSnapshot).toEqual(snapshot)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/storage.test.ts`
Expected: FAIL — TypeScript errors for missing `splitMemberIds`/`splitMode` on `defaultInputs`/`customData.inputs`, and `decoded!.splitSnapshot` is `undefined`

- [ ] **Step 3: Update `lib/storage.ts`**

```ts
// lib/storage.ts
import {
  MortgageInputs,
  Expense,
  BuyerType,
  RepaymentFrequency,
  ExpenseFrequency,
  SplitSnapshotEntry,
} from '@/types/mortgage'

const STORAGE_KEYS = {
  MORTGAGE_INPUTS: 'finance-tools-mortgage-inputs',
  MORTGAGE_EXPENSES: 'finance-tools-mortgage-expenses',
} as const

export interface MortgageStorageData {
  inputs: MortgageInputs
  expenses: Expense[]
}

export interface DecodedMortgageData extends MortgageStorageData {
  splitSnapshot: SplitSnapshotEntry[] | null
}

// Default values - used to skip encoding defaults
const DEFAULTS: MortgageInputs = {
  loanAmount: 0,
  deposit: 0,
  interestRate: 0,
  loanTermYears: 30,
  repaymentFrequency: 'monthly',
  offsetBalance: 0,
  buyerType: 'standard',
  includeLegalFees: true,
  includeBuildingInspection: true,
  splitMemberIds: [],
  splitMode: 'even',
}

// Compact key mapping for URL encoding
// Note: splitMemberIds/splitMode are intentionally NOT encoded here — they reference the
// sender's local household member IDs, which are meaningless to a recipient. The split is
// instead shared as a frozen name+amount snapshot (see `sp` below).
const KEY_MAP = {
  loanAmount: 'p', // property price
  deposit: 'd', // deposit
  interestRate: 'r', // rate
  loanTermYears: 't', // term
  repaymentFrequency: 'f', // frequency
  offsetBalance: 'o', // offset
  buyerType: 'b', // buyer
  includeLegalFees: 'l', // legal
  includeBuildingInspection: 'i', // inspection
} as const

// Reverse mapping for decoding
const REVERSE_KEY_MAP = Object.fromEntries(
  Object.entries(KEY_MAP).map(([k, v]) => [v, k]),
) as Record<string, keyof MortgageInputs>

// Frequency abbreviations
const FREQ_MAP: Record<RepaymentFrequency, string> = {
  weekly: 'w',
  fortnightly: 'f',
  monthly: 'm',
}
const REVERSE_FREQ_MAP: Record<string, RepaymentFrequency> = {
  w: 'weekly',
  f: 'fortnightly',
  m: 'monthly',
}

// Buyer type abbreviations
const BUYER_MAP: Record<BuyerType, string> = {
  standard: 's',
  first_home_buyer: 'h',
  foreign_buyer: 'x',
}
const REVERSE_BUYER_MAP: Record<string, BuyerType> = {
  s: 'standard',
  h: 'first_home_buyer',
  x: 'foreign_buyer',
}

// Expense frequency abbreviations
const EXP_FREQ_MAP: Record<ExpenseFrequency, string> = {
  monthly: 'm',
  quarterly: 'q',
  annually: 'a',
}
const REVERSE_EXP_FREQ_MAP: Record<string, ExpenseFrequency> = {
  m: 'monthly',
  q: 'quarterly',
  a: 'annually',
}

/**
 * Save mortgage data to localStorage
 */
export function saveMortgageData(data: MortgageStorageData): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MORTGAGE_INPUTS, JSON.stringify(data.inputs))
    localStorage.setItem(STORAGE_KEYS.MORTGAGE_EXPENSES, JSON.stringify(data.expenses))
  } catch (error) {
    console.error('Failed to save to localStorage:', error)
  }
}

/**
 * Load mortgage data from localStorage
 */
export function loadMortgageData(): MortgageStorageData | null {
  try {
    const inputsJson = localStorage.getItem(STORAGE_KEYS.MORTGAGE_INPUTS)
    const expensesJson = localStorage.getItem(STORAGE_KEYS.MORTGAGE_EXPENSES)

    if (!inputsJson) return null

    return {
      inputs: JSON.parse(inputsJson),
      expenses: expensesJson ? JSON.parse(expensesJson) : [],
    }
  } catch (error) {
    console.error('Failed to load from localStorage:', error)
    return null
  }
}

/**
 * Clear mortgage data from localStorage
 */
export function clearMortgageData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.MORTGAGE_INPUTS)
    localStorage.removeItem(STORAGE_KEYS.MORTGAGE_EXPENSES)
  } catch (error) {
    console.error('Failed to clear localStorage:', error)
  }
}

/**
 * Compact encoding: Only non-default values with short keys
 */
interface CompactData {
  [key: string]: string | number | boolean | CompactExpense[] | CompactSplitEntry[] | undefined
  e?: CompactExpense[] // expenses
  sp?: CompactSplitEntry[] // split snapshot (name + amount, frozen at share time)
}

interface CompactExpense {
  n: string // name
  a: number // amount
  f: string // frequency
}

interface CompactSplitEntry {
  n: string // name
  a: number // amount
}

/**
 * Encode mortgage data to a compact URL-safe string.
 * `splitSnapshot`, if provided, is embedded as frozen name+amount pairs — never member IDs.
 */
export function encodeMortgageData(
  data: MortgageStorageData,
  splitSnapshot?: SplitSnapshotEntry[],
): string {
  try {
    const compact: CompactData = {}

    // Only include non-default input values
    const inputs = data.inputs
    if (inputs.loanAmount !== DEFAULTS.loanAmount) compact[KEY_MAP.loanAmount] = inputs.loanAmount
    if (inputs.deposit !== DEFAULTS.deposit) compact[KEY_MAP.deposit] = inputs.deposit
    if (inputs.interestRate !== DEFAULTS.interestRate)
      compact[KEY_MAP.interestRate] = inputs.interestRate
    if (inputs.loanTermYears !== DEFAULTS.loanTermYears)
      compact[KEY_MAP.loanTermYears] = inputs.loanTermYears
    if (inputs.repaymentFrequency !== DEFAULTS.repaymentFrequency) {
      compact[KEY_MAP.repaymentFrequency] = FREQ_MAP[inputs.repaymentFrequency]
    }
    if (inputs.offsetBalance !== DEFAULTS.offsetBalance)
      compact[KEY_MAP.offsetBalance] = inputs.offsetBalance
    if (inputs.buyerType !== DEFAULTS.buyerType) {
      compact[KEY_MAP.buyerType] = BUYER_MAP[inputs.buyerType]
    }
    if (inputs.includeLegalFees !== DEFAULTS.includeLegalFees) {
      compact[KEY_MAP.includeLegalFees] = inputs.includeLegalFees ? 1 : 0
    }
    if (inputs.includeBuildingInspection !== DEFAULTS.includeBuildingInspection) {
      compact[KEY_MAP.includeBuildingInspection] = inputs.includeBuildingInspection ? 1 : 0
    }

    // Include expenses if any (with non-zero amounts)
    const validExpenses = data.expenses.filter((e) => e.name && e.amount > 0)
    if (validExpenses.length > 0) {
      compact.e = validExpenses.map((exp) => ({
        n: exp.name,
        a: exp.amount,
        f: EXP_FREQ_MAP[exp.frequency],
      }))
    }

    // Include the frozen split snapshot, if any
    if (splitSnapshot && splitSnapshot.length > 0) {
      compact.sp = splitSnapshot.map((entry) => ({ n: entry.name, a: entry.amount }))
    }

    const json = JSON.stringify(compact)
    // URL-safe base64: replace + with -, / with _, remove padding =
    return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  } catch (error) {
    console.error('Failed to encode mortgage data:', error)
    return ''
  }
}

/**
 * Decode mortgage data from compact URL-safe string
 */
export function decodeMortgageData(encoded: string): DecodedMortgageData | null {
  try {
    // Restore URL-safe base64 to standard base64
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    // Add padding if needed
    while (base64.length % 4) base64 += '='

    const json = atob(base64)
    const compact: CompactData = JSON.parse(json)

    // Reconstruct inputs from compact format (splitMemberIds/splitMode always come from
    // DEFAULTS — they are never part of the shared link)
    const inputs: MortgageInputs = { ...DEFAULTS }

    for (const [shortKey, value] of Object.entries(compact)) {
      if (shortKey === 'e' || shortKey === 'sp') continue // handled separately

      const fullKey = REVERSE_KEY_MAP[shortKey]
      if (!fullKey) continue

      if (fullKey === 'repaymentFrequency' && typeof value === 'string') {
        inputs.repaymentFrequency = REVERSE_FREQ_MAP[value] || DEFAULTS.repaymentFrequency
      } else if (fullKey === 'buyerType' && typeof value === 'string') {
        inputs.buyerType = REVERSE_BUYER_MAP[value] || DEFAULTS.buyerType
      } else if (fullKey === 'includeLegalFees') {
        inputs.includeLegalFees = value === 1
      } else if (fullKey === 'includeBuildingInspection') {
        inputs.includeBuildingInspection = value === 1
      } else if (fullKey === 'loanAmount' && typeof value === 'number') {
        inputs.loanAmount = value
      } else if (fullKey === 'deposit' && typeof value === 'number') {
        inputs.deposit = value
      } else if (fullKey === 'interestRate' && typeof value === 'number') {
        inputs.interestRate = value
      } else if (fullKey === 'loanTermYears' && typeof value === 'number') {
        inputs.loanTermYears = value
      } else if (fullKey === 'offsetBalance' && typeof value === 'number') {
        inputs.offsetBalance = value
      }
    }

    // Reconstruct expenses
    const expenses: Expense[] = []
    if (compact.e && Array.isArray(compact.e)) {
      for (const exp of compact.e) {
        expenses.push({
          id: crypto.randomUUID(),
          name: exp.n,
          amount: exp.a,
          frequency: REVERSE_EXP_FREQ_MAP[exp.f] || 'monthly',
        })
      }
    }

    // Reconstruct the split snapshot
    const splitSnapshot: SplitSnapshotEntry[] | null =
      compact.sp && Array.isArray(compact.sp) && compact.sp.length > 0
        ? compact.sp.map((entry) => ({ name: entry.n, amount: entry.a }))
        : null

    return { inputs, expenses, splitSnapshot }
  } catch (error) {
    console.error('Failed to decode mortgage data:', error)
    return null
  }
}

/**
 * Generate shareable URL with encoded mortgage data and an optional split snapshot
 */
export function generateShareUrl(
  data: MortgageStorageData,
  splitSnapshot?: SplitSnapshotEntry[],
): string {
  const encoded = encodeMortgageData(data, splitSnapshot)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  return `${baseUrl}/tools/mortgage?data=${encoded}`
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/storage.test.ts`
Expected: PASS (all tests, including the 2 new split-snapshot ones)

- [ ] **Step 5: Commit**

```bash
git add lib/storage.ts lib/storage.test.ts
git commit -m "Add split snapshot encoding to mortgage share links"
```

---

### Task 10: Wire `useMortgageCalculator` to household data

**Files:**
- Modify: `components/tools/mortgage/useMortgageCalculator.ts`
- Modify: `components/tools/mortgage/useMortgageCalculator.test.ts`

**Interfaces:**
- Consumes: `useHousehold` from `@/components/household` (Task 4), updated `calculateMortgageResults`/`MortgageInputs`/`SplitSnapshotEntry` (Task 8), updated `decodeMortgageData`/`generateShareUrl` (Task 9)
- Produces: hook now also returns `members: HouseholdMember[]` and `displaySplitBreakdown: SplitSnapshotEntry[]` — consumed by Task 11 (`MortgageForm`), Task 12 (`ResultsSummary`), Task 13 (`app/tools/mortgage/page.tsx`).

- [ ] **Step 1: Update the failing tests in `useMortgageCalculator.test.ts`**

```ts
// components/tools/mortgage/useMortgageCalculator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useMortgageCalculator } from './useMortgageCalculator'
import { encodeMortgageData, MortgageStorageData } from '@/lib/storage'
import { MortgageInputs } from '@/types/mortgage'

const mockUseSearchParams = vi.fn()

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockUseSearchParams(),
}))

const baseInputs: MortgageInputs = {
  loanAmount: 0,
  deposit: 0,
  interestRate: 0,
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
  mockUseSearchParams.mockReturnValue(new URLSearchParams())
  vi.stubGlobal(
    'confirm',
    vi.fn(() => true),
  )
  Object.assign(navigator, { clipboard: { writeText: vi.fn(() => Promise.resolve()) } })
})

describe('useMortgageCalculator', () => {
  it('loads saved data from localStorage on mount', async () => {
    const saved: MortgageStorageData = {
      inputs: { ...baseInputs, loanAmount: 600000, deposit: 120000, interestRate: 6 },
      expenses: [],
    }
    localStorage.setItem('finance-tools-mortgage-inputs', JSON.stringify(saved.inputs))

    const { result } = renderHook(() => useMortgageCalculator())

    await waitFor(() => expect(result.current.inputs.loanAmount).toBe(600000))
  })

  it('loads data from the URL param when present, taking priority over localStorage', async () => {
    const shared: MortgageStorageData = {
      inputs: {
        ...baseInputs,
        loanAmount: 700000,
        deposit: 140000,
        interestRate: 5.5,
        loanTermYears: 25,
        repaymentFrequency: 'fortnightly',
        buyerType: 'first_home_buyer',
      },
      expenses: [],
    }
    mockUseSearchParams.mockReturnValue(new URLSearchParams({ data: encodeMortgageData(shared) }))

    const { result } = renderHook(() => useMortgageCalculator())

    await waitFor(() => expect(result.current.inputs.loanAmount).toBe(700000))
    expect(result.current.inputs.buyerType).toBe('first_home_buyer')
  })

  it('persists inputs to localStorage once loaded', async () => {
    const { result } = renderHook(() => useMortgageCalculator())
    await waitFor(() => expect(result.current.inputs.loanAmount).toBe(0))

    act(() => {
      result.current.setInputs({ ...result.current.inputs, loanAmount: 550000 })
    })

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('finance-tools-mortgage-inputs') || '{}')
      expect(stored.loanAmount).toBe(550000)
    })
  })

  it('resets inputs and expenses to their defaults when confirmed', async () => {
    const { result } = renderHook(() => useMortgageCalculator())
    await waitFor(() => expect(result.current.inputs.loanAmount).toBe(0))

    act(() => {
      result.current.setInputs({ ...result.current.inputs, loanAmount: 400000 })
      result.current.setExpenses([{ id: '1', name: 'Rates', amount: 300, frequency: 'quarterly' }])
    })
    await waitFor(() => expect(result.current.inputs.loanAmount).toBe(400000))

    act(() => {
      result.current.handleReset()
    })

    expect(result.current.inputs.loanAmount).toBe(0)
    expect(result.current.expenses).toEqual([])

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('finance-tools-mortgage-inputs') || '{}')
      expect(stored.loanAmount).toBe(0)
    })
    expect(JSON.parse(localStorage.getItem('finance-tools-mortgage-expenses') || '[]')).toEqual([])
  })

  it('does not reset when the confirmation is declined', async () => {
    vi.stubGlobal(
      'confirm',
      vi.fn(() => false),
    )
    const { result } = renderHook(() => useMortgageCalculator())
    await waitFor(() => expect(result.current.inputs.loanAmount).toBe(0))

    act(() => {
      result.current.setInputs({ ...result.current.inputs, loanAmount: 400000 })
    })
    await waitFor(() => expect(result.current.inputs.loanAmount).toBe(400000))

    act(() => {
      result.current.handleReset()
    })

    expect(result.current.inputs.loanAmount).toBe(400000)
  })

  it('generates a share URL and opens the share modal', async () => {
    const { result } = renderHook(() => useMortgageCalculator())
    await waitFor(() => expect(result.current.inputs.loanAmount).toBe(0))

    act(() => {
      result.current.handleShare()
    })

    expect(result.current.showShareModal).toBe(true)
    expect(result.current.shareUrl).toContain('/tools/mortgage?data=')
  })

  it('copies the share URL to the clipboard', async () => {
    const { result } = renderHook(() => useMortgageCalculator())
    await waitFor(() => expect(result.current.inputs.loanAmount).toBe(0))

    act(() => {
      result.current.handleShare()
    })

    await act(async () => {
      await result.current.handleCopy()
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(result.current.shareUrl)
    expect(result.current.copied).toBe(true)
  })

  it('exposes household members and computes a live split once two are selected', async () => {
    localStorage.setItem(
      'finance-tools-household',
      JSON.stringify([
        { id: 'a', name: 'Alex', income: 100000 },
        { id: 'b', name: 'Sam', income: 50000 },
      ]),
    )

    const { result } = renderHook(() => useMortgageCalculator())
    await waitFor(() => expect(result.current.members).toHaveLength(2))

    act(() => {
      result.current.setInputs({
        ...result.current.inputs,
        loanAmount: 500000,
        deposit: 100000,
        interestRate: 6,
        splitMemberIds: ['a', 'b'],
        splitMode: 'even',
      })
    })

    await waitFor(() => expect(result.current.displaySplitBreakdown).toHaveLength(2))
    expect(result.current.displaySplitBreakdown[0].amount).toBeCloseTo(
      result.current.displaySplitBreakdown[1].amount,
    )
  })

  it('shows a frozen share snapshot until the user edits an input', async () => {
    const shared: MortgageStorageData = {
      inputs: { ...baseInputs, loanAmount: 500000, deposit: 100000, interestRate: 6 },
      expenses: [],
    }
    const snapshot = [{ name: 'Alex', amount: 1200 }]
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams({ data: encodeMortgageData(shared, snapshot) }),
    )

    const { result } = renderHook(() => useMortgageCalculator())
    await waitFor(() => expect(result.current.inputs.loanAmount).toBe(500000))
    expect(result.current.displaySplitBreakdown).toEqual(snapshot)

    act(() => {
      result.current.setInputs({ ...result.current.inputs, loanAmount: 600000 })
    })

    await waitFor(() => expect(result.current.inputs.loanAmount).toBe(600000))
    expect(result.current.displaySplitBreakdown).not.toEqual(snapshot)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run components/tools/mortgage/useMortgageCalculator.test.ts`
Expected: FAIL — `result.current.members` / `result.current.displaySplitBreakdown` are `undefined`; `calculateMortgageResults` is still called with 2 arguments

- [ ] **Step 3: Update `useMortgageCalculator.ts`**

```ts
// components/tools/mortgage/useMortgageCalculator.ts
'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { MortgageInputs, Expense, ExpenseBreakdownItem, SplitSnapshotEntry } from '@/types/mortgage'
import {
  calculateMortgageResults,
  calculatePurchaseCosts,
  convertToMonthly,
} from '@/lib/calculations/mortgage'
import {
  saveMortgageData,
  loadMortgageData,
  clearMortgageData,
  decodeMortgageData,
  generateShareUrl,
} from '@/lib/storage'
import { useHousehold } from '@/components/household'
import { CHART_ACCENT_COLOR, CHART_PALETTE } from '@/components/charts/theme'

const DEFAULT_INPUTS: MortgageInputs = {
  loanAmount: 0,
  deposit: 0,
  interestRate: 0,
  loanTermYears: 30,
  repaymentFrequency: 'monthly',
  offsetBalance: 0,
  buyerType: 'standard',
  includeLegalFees: true,
  includeBuildingInspection: true,
  splitMemberIds: [],
  splitMode: 'even',
}

export function useMortgageCalculator() {
  const searchParams = useSearchParams()
  const { members } = useHousehold()
  const [inputs, setInputsState] = useState<MortgageInputs>(DEFAULT_INPUTS)
  const [expenses, setExpensesState] = useState<Expense[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [sharedSplitSnapshot, setSharedSplitSnapshot] = useState<SplitSnapshotEntry[] | null>(null)

  // Load data from URL params or localStorage on mount
  useEffect(() => {
    const urlData = searchParams.get('data')

    if (urlData) {
      const decoded = decodeMortgageData(urlData)
      if (decoded) {
        setInputsState(decoded.inputs)
        setExpensesState(decoded.expenses)
        setSharedSplitSnapshot(decoded.splitSnapshot)
        setIsLoaded(true)
        return
      }
    }

    const savedData = loadMortgageData()
    if (savedData) {
      setInputsState(savedData.inputs)
      setExpensesState(savedData.expenses)
    }
    setIsLoaded(true)
  }, [searchParams])

  // Save to localStorage whenever inputs or expenses change
  useEffect(() => {
    if (isLoaded) {
      saveMortgageData({ inputs, expenses })
    }
  }, [inputs, expenses, isLoaded])

  // Wrapped setters: any user-driven edit invalidates a shared split snapshot, so the
  // display falls back to the live calculation from the user's own household
  const setInputs = useCallback((next: MortgageInputs) => {
    setInputsState(next)
    setSharedSplitSnapshot(null)
  }, [])

  const setExpenses = useCallback((next: Expense[]) => {
    setExpensesState(next)
    setSharedSplitSnapshot(null)
  }, [])

  // Reset form handler
  const handleReset = useCallback(() => {
    if (confirm('Are you sure you want to reset the form? This will clear all your data.')) {
      setInputsState(DEFAULT_INPUTS)
      setExpensesState([])
      setSharedSplitSnapshot(null)
      clearMortgageData()
      window.history.replaceState({}, '', '/tools/mortgage')
    }
  }, [])

  // Calculate purchase costs
  const purchaseCosts = useMemo(() => {
    if (inputs.loanAmount > 0 && inputs.deposit > 0) {
      return calculatePurchaseCosts(
        inputs.loanAmount,
        inputs.deposit,
        inputs.buyerType,
        inputs.includeLegalFees,
        inputs.includeBuildingInspection,
      )
    }
    return null
  }, [
    inputs.loanAmount,
    inputs.deposit,
    inputs.buyerType,
    inputs.includeLegalFees,
    inputs.includeBuildingInspection,
  ])

  // Calculate mortgage results using effective loan amount (after costs)
  const results = useMemo(() => {
    if (inputs.loanAmount > 0 && inputs.interestRate > 0 && inputs.loanTermYears > 0) {
      const adjustedInputs = {
        ...inputs,
        deposit: purchaseCosts?.effectiveDeposit ?? inputs.deposit,
      }
      return calculateMortgageResults(adjustedInputs, expenses, members)
    }
    return null
  }, [inputs, expenses, purchaseCosts, members])

  // Share handler - snapshots the current split breakdown by name, not member ID
  const handleShare = useCallback(() => {
    const snapshot: SplitSnapshotEntry[] | undefined = results
      ? results.splitBreakdown.map(({ name, amount }) => ({ name, amount }))
      : undefined
    const url = generateShareUrl({ inputs, expenses }, snapshot)
    setShareUrl(url)
    setShowShareModal(true)
    setCopied(false)
  }, [inputs, expenses, results])

  // Copy to clipboard handler
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }, [shareUrl])

  const expenseBreakdownData = useMemo<ExpenseBreakdownItem[]>(() => {
    if (!results) return []

    const items: ExpenseBreakdownItem[] = [
      {
        name: 'Mortgage',
        value: results.monthlyMortgagePayment,
        color: CHART_ACCENT_COLOR,
      },
    ]

    expenses.forEach((expense, index) => {
      if (expense.name && expense.amount > 0) {
        items.push({
          name: expense.name,
          value: convertToMonthly(expense.amount, expense.frequency),
          color: CHART_PALETTE[index % CHART_PALETTE.length],
        })
      }
    })

    return items
  }, [results, expenses])

  // A frozen share snapshot (if present and unedited) takes priority over the live split
  const displaySplitBreakdown: SplitSnapshotEntry[] =
    sharedSplitSnapshot ??
    results?.splitBreakdown.map(({ name, amount }) => ({ name, amount })) ??
    []

  return {
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
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run components/tools/mortgage/useMortgageCalculator.test.ts`
Expected: PASS (all tests, including the 2 new household-related ones)

- [ ] **Step 5: Commit**

```bash
git add components/tools/mortgage/useMortgageCalculator.ts components/tools/mortgage/useMortgageCalculator.test.ts
git commit -m "Wire useMortgageCalculator to household data and share-snapshot splits"
```

---

### Task 11: "Split between" UI in `MortgageForm`

**Files:**
- Modify: `components/tools/mortgage/MortgageForm.tsx`
- Modify: `components/tools/mortgage/MortgageForm.test.tsx`

**Interfaces:**
- Consumes: `HouseholdMember` from `@/types/household` (Task 1)
- Produces: `MortgageForm` now requires a `members: HouseholdMember[]` prop — consumed by Task 13 (`app/tools/mortgage/page.tsx`)

- [ ] **Step 1: Update the failing tests in `MortgageForm.test.tsx`**

```tsx
// components/tools/mortgage/MortgageForm.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MortgageForm } from './MortgageForm'
import { MortgageInputs } from '@/types/mortgage'
import { HouseholdMember } from '@/types/household'

const inputs: MortgageInputs = {
  loanAmount: 500000,
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

describe('MortgageForm', () => {
  it('reflects the current input values', () => {
    render(<MortgageForm inputs={inputs} onChange={() => {}} members={[]} />)
    expect(screen.getByLabelText('Property Price')).toHaveValue(500000)
    expect(screen.getByLabelText('Your Deposit')).toHaveValue(100000)
    expect(screen.getByLabelText('Interest Rate (% p.a.)')).toHaveValue(6)
    expect(screen.getByLabelText('Repayment Frequency')).toHaveValue('monthly')
    expect(screen.getByLabelText('Buyer Type')).toHaveValue('standard')
  })

  it('calls onChange with a numeric field updated on input', async () => {
    const onChange = vi.fn()
    render(<MortgageForm inputs={inputs} onChange={onChange} members={[]} />)
    await userEvent.type(screen.getByLabelText('Offset Account Balance'), '5')
    expect(onChange).toHaveBeenLastCalledWith({ ...inputs, offsetBalance: 5 })
  })

  it('calls onChange when the buyer type select changes', async () => {
    const onChange = vi.fn()
    render(<MortgageForm inputs={inputs} onChange={onChange} members={[]} />)
    await userEvent.selectOptions(screen.getByLabelText('Buyer Type'), 'first_home_buyer')
    expect(onChange).toHaveBeenCalledWith({ ...inputs, buyerType: 'first_home_buyer' })
  })

  it('calls onChange when a cost checkbox is toggled', async () => {
    const onChange = vi.fn()
    render(<MortgageForm inputs={inputs} onChange={onChange} members={[]} />)
    await userEvent.click(screen.getByLabelText(/Legal\/Conveyancing/))
    expect(onChange).toHaveBeenCalledWith({ ...inputs, includeLegalFees: false })
  })

  it('does not show the split section with fewer than two household members', () => {
    const oneMember: HouseholdMember[] = [{ id: 'a', name: 'Alex', income: 100000 }]
    render(<MortgageForm inputs={inputs} onChange={() => {}} members={oneMember} />)
    expect(screen.queryByText('Split between:')).not.toBeInTheDocument()
  })

  it('shows a checkbox per member and toggles splitMemberIds', async () => {
    const onChange = vi.fn()
    const members: HouseholdMember[] = [
      { id: 'a', name: 'Alex', income: 100000 },
      { id: 'b', name: 'Sam', income: 50000 },
    ]
    render(<MortgageForm inputs={inputs} onChange={onChange} members={members} />)

    expect(screen.getByText('Split between:')).toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('Alex'))
    expect(onChange).toHaveBeenCalledWith({ ...inputs, splitMemberIds: ['a'] })
  })

  it('toggles splitMode between even and income', async () => {
    const onChange = vi.fn()
    const members: HouseholdMember[] = [
      { id: 'a', name: 'Alex', income: 100000 },
      { id: 'b', name: 'Sam', income: 50000 },
    ]
    render(<MortgageForm inputs={inputs} onChange={onChange} members={members} />)

    await userEvent.click(screen.getByRole('button', { name: 'Split by income' }))
    expect(onChange).toHaveBeenCalledWith({ ...inputs, splitMode: 'income' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run components/tools/mortgage/MortgageForm.test.tsx`
Expected: FAIL — `MortgageForm` doesn't accept a `members` prop yet; the new split-section assertions find nothing

- [ ] **Step 3: Update `MortgageForm.tsx`**

```tsx
// components/tools/mortgage/MortgageForm.tsx
'use client'

import {
  Input,
  Select,
  Checkbox,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CalculatorIcon,
} from '@/components/ui'
import { MortgageInputs, RepaymentFrequency, BuyerType } from '@/types/mortgage'
import { HouseholdMember } from '@/types/household'

interface MortgageFormProps {
  inputs: MortgageInputs
  onChange: (inputs: MortgageInputs) => void
  members: HouseholdMember[]
}

const repaymentFrequencyOptions = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'weekly', label: 'Weekly' },
]

const buyerTypeOptions = [
  { value: 'standard', label: 'Standard Buyer' },
  { value: 'first_home_buyer', label: 'First Home Buyer' },
  { value: 'foreign_buyer', label: 'Foreign Buyer' },
]

export function MortgageForm({ inputs, onChange, members }: MortgageFormProps) {
  const handleChange = (
    field: keyof MortgageInputs,
    value: string | number | boolean | string[],
  ) => {
    onChange({
      ...inputs,
      [field]: value,
    })
  }

  const toggleSplitMember = (memberId: string, included: boolean) => {
    const next = included
      ? [...inputs.splitMemberIds, memberId]
      : inputs.splitMemberIds.filter((id) => id !== memberId)
    handleChange('splitMemberIds', next)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalculatorIcon width="20" height="20" className="text-accent" />
          Loan Details
        </CardTitle>
        <p className="text-sm text-muted mt-1">Victorian stamp duty rates applied</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Property Price"
              type="number"
              prefix="$"
              placeholder="500000"
              value={inputs.loanAmount || ''}
              onChange={(e) => handleChange('loanAmount', parseFloat(e.target.value) || 0)}
            />
            <Input
              label="Your Deposit"
              type="number"
              prefix="$"
              placeholder="100000"
              value={inputs.deposit || ''}
              onChange={(e) => handleChange('deposit', parseFloat(e.target.value) || 0)}
            />
            <Input
              label="Interest Rate (% p.a.)"
              type="number"
              suffix="%"
              placeholder="6.5"
              step="0.01"
              value={inputs.interestRate || ''}
              onChange={(e) => handleChange('interestRate', parseFloat(e.target.value) || 0)}
            />
            <Input
              label="Loan Term (years)"
              type="number"
              suffix="years"
              placeholder="30"
              value={inputs.loanTermYears || ''}
              onChange={(e) => handleChange('loanTermYears', parseInt(e.target.value) || 0)}
            />
            <Select
              label="Repayment Frequency"
              options={repaymentFrequencyOptions}
              value={inputs.repaymentFrequency}
              onChange={(e) =>
                handleChange('repaymentFrequency', e.target.value as RepaymentFrequency)
              }
            />
            <Select
              label="Buyer Type"
              options={buyerTypeOptions}
              value={inputs.buyerType}
              onChange={(e) => handleChange('buyerType', e.target.value as BuyerType)}
            />
            <Input
              label="Offset Account Balance"
              type="number"
              prefix="$"
              placeholder="0"
              value={inputs.offsetBalance || ''}
              onChange={(e) => handleChange('offsetBalance', parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* Optional costs checkboxes */}
          <div className="pt-4 border-t border-border">
            <p className="text-sm font-medium text-foreground mb-3">Include in cost estimate:</p>
            <div className="flex flex-wrap gap-4">
              <Checkbox
                label="Legal/Conveyancing (~$2,000)"
                checked={inputs.includeLegalFees}
                onChange={(e) => handleChange('includeLegalFees', e.target.checked)}
              />
              <Checkbox
                label="Building & Pest Inspection (~$650)"
                checked={inputs.includeBuildingInspection}
                onChange={(e) => handleChange('includeBuildingInspection', e.target.checked)}
              />
            </div>
          </div>

          {/* Cost split, only relevant with 2+ household members */}
          {members.length >= 2 && (
            <div className="pt-4 border-t border-border">
              <p className="text-sm font-medium text-foreground mb-3">Split between:</p>
              <div className="flex flex-wrap gap-4 mb-4">
                {members.map((member) => (
                  <Checkbox
                    key={member.id}
                    id={`split-member-${member.id}`}
                    label={member.name || 'Unnamed'}
                    checked={inputs.splitMemberIds.includes(member.id)}
                    onChange={(e) => toggleSplitMember(member.id, e.target.checked)}
                  />
                ))}
              </div>
              <div className="inline-flex rounded-lg border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleChange('splitMode', 'even')}
                  className={`px-3 py-1.5 text-sm transition-colors ${
                    inputs.splitMode === 'even'
                      ? 'bg-accent text-background'
                      : 'bg-card text-foreground hover:bg-border'
                  }`}
                >
                  Split evenly
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('splitMode', 'income')}
                  className={`px-3 py-1.5 text-sm transition-colors ${
                    inputs.splitMode === 'income'
                      ? 'bg-accent text-background'
                      : 'bg-card text-foreground hover:bg-border'
                  }`}
                >
                  Split by income
                </button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run components/tools/mortgage/MortgageForm.test.tsx`
Expected: PASS (all tests, including the 3 new split-section ones)

- [ ] **Step 5: Commit**

```bash
git add components/tools/mortgage/MortgageForm.tsx components/tools/mortgage/MortgageForm.test.tsx
git commit -m "Add split-between member checklist and even/income toggle to MortgageForm"
```

---

### Task 12: Split breakdown display in `ResultsSummary`

**Files:**
- Modify: `components/tools/mortgage/ResultsSummary.tsx`
- Modify: `components/tools/mortgage/ResultsSummary.test.tsx`

**Interfaces:**
- Consumes: `SplitSnapshotEntry` from `@/types/mortgage` (Task 8)
- Produces: `ResultsSummary` now requires a `splitBreakdown: SplitSnapshotEntry[]` prop — consumed by Task 13 (`app/tools/mortgage/page.tsx`)

- [ ] **Step 1: Update the failing tests in `ResultsSummary.test.tsx`**

```tsx
// components/tools/mortgage/ResultsSummary.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResultsSummary } from './ResultsSummary'
import { MortgageResults } from '@/types/mortgage'

const results: MortgageResults = {
  principalAmount: 400000,
  repaymentAmount: 2400,
  repaymentFrequency: 'monthly',
  totalRepayments: 864000,
  totalInterest: 464000,
  payoffDate: new Date('2056-01-01'),
  monthlyMortgagePayment: 2400,
  monthlyExpensesTotal: 300,
  totalMonthlyOutgoing: 2700,
  splitBreakdown: [
    { memberId: 'a', name: 'Rafael', amount: 1350 },
    { memberId: 'b', name: 'Partner', amount: 1350 },
  ],
  amortisationSchedule: [],
}

describe('ResultsSummary', () => {
  it('shows an empty state when there are no results', () => {
    render(<ResultsSummary results={null} splitBreakdown={[]} />)
    expect(screen.getByText('Enter your loan details to see the results.')).toBeInTheDocument()
  })

  it('renders key stats when results are provided', () => {
    render(<ResultsSummary results={results} splitBreakdown={[]} />)
    expect(screen.getByText('Loan Amount')).toBeInTheDocument()
    expect(screen.getByText('$400,000')).toBeInTheDocument()
    expect(screen.getByText('Total Monthly')).toBeInTheDocument()
    expect(screen.getByText('$2,700.00')).toBeInTheDocument()
  })

  it('shows no split section when the breakdown is empty', () => {
    render(<ResultsSummary results={results} splitBreakdown={[]} />)
    expect(screen.queryByText('Split')).not.toBeInTheDocument()
  })

  it('renders one stat per person in the split breakdown', () => {
    render(
      <ResultsSummary
        results={results}
        splitBreakdown={[
          { name: 'Rafael', amount: 1350 },
          { name: 'Partner', amount: 1350 },
        ]}
      />,
    )
    expect(screen.getByText('Split')).toBeInTheDocument()
    expect(screen.getByText('Rafael')).toBeInTheDocument()
    expect(screen.getByText('Partner')).toBeInTheDocument()
    expect(screen.getAllByText('$1,350.00')).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run components/tools/mortgage/ResultsSummary.test.tsx`
Expected: FAIL — `ResultsSummary` doesn't accept a `splitBreakdown` prop yet; `results.perPersonAmount` no longer exists on the fixture

- [ ] **Step 3: Update `ResultsSummary.tsx`**

```tsx
// components/tools/mortgage/ResultsSummary.tsx
'use client'

import { Card, CardHeader, CardTitle, CardContent, ChartBarIcon } from '@/components/ui'
import { MortgageResults, SplitSnapshotEntry } from '@/types/mortgage'
import {
  formatCurrency,
  formatCurrencyPrecise,
  formatFrequencyLabel,
} from '@/lib/calculations/mortgage'

interface ResultsSummaryProps {
  results: MortgageResults | null
  splitBreakdown: SplitSnapshotEntry[]
}

function StatCard({
  label,
  value,
  subtext,
  highlight = false,
}: {
  label: string
  value: string
  subtext?: string
  highlight?: boolean
}) {
  return (
    <div
      className={`p-3 rounded-lg min-w-0 overflow-hidden ${
        highlight ? 'bg-accent/10 border border-accent/30' : 'bg-background'
      }`}
    >
      <p className="text-xs text-muted mb-1 whitespace-nowrap truncate">{label}</p>
      <p className={`text-lg font-bold truncate ${highlight ? 'text-accent' : 'text-foreground'}`}>
        {value}
      </p>
      {subtext && <p className="text-xs text-muted mt-1 whitespace-nowrap">{subtext}</p>}
    </div>
  )
}

export function ResultsSummary({ results, splitBreakdown }: ResultsSummaryProps) {
  if (!results) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartBarIcon width="20" height="20" className="text-accent" />
            Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted">
            <p>Enter your loan details to see the results.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartBarIcon width="20" height="20" className="text-accent" />
          Results Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Repayment Details */}
          <div>
            <h4 className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
              Mortgage Repayments
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <StatCard label="Loan Amount" value={formatCurrency(results.principalAmount)} />
              <StatCard
                label={`Repayment ${formatFrequencyLabel(results.repaymentFrequency)}`}
                value={formatCurrencyPrecise(results.repaymentAmount)}
              />
              <StatCard
                label="Monthly Equivalent"
                value={formatCurrencyPrecise(results.monthlyMortgagePayment)}
              />
            </div>
          </div>

          {/* Total Monthly Outgoings */}
          <div>
            <h4 className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
              Monthly Outgoings
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <StatCard
                label="Mortgage"
                value={formatCurrencyPrecise(results.monthlyMortgagePayment)}
              />
              <StatCard
                label="Other Expenses"
                value={formatCurrencyPrecise(results.monthlyExpensesTotal)}
              />
              <StatCard
                label="Total Monthly"
                value={formatCurrencyPrecise(results.totalMonthlyOutgoing)}
                highlight
              />
            </div>
          </div>

          {/* Cost split, only shown once there's a breakdown to show */}
          {splitBreakdown.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
                Split
              </h4>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {splitBreakdown.map((entry) => (
                  <StatCard
                    key={entry.name}
                    label={entry.name}
                    value={formatCurrencyPrecise(entry.amount)}
                    subtext="per month"
                    highlight
                  />
                ))}
              </div>
            </div>
          )}

          {/* Loan Summary */}
          <div>
            <h4 className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
              Loan Overview
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <StatCard label="Total Repayments" value={formatCurrency(results.totalRepayments)} />
              <StatCard label="Total Interest" value={formatCurrency(results.totalInterest)} />
              <StatCard
                label="Payoff Date"
                value={results.payoffDate.toLocaleDateString('en-AU', {
                  month: 'long',
                  year: 'numeric',
                })}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run components/tools/mortgage/ResultsSummary.test.tsx`
Expected: PASS (all tests, including the 2 new split-breakdown ones)

- [ ] **Step 5: Commit**

```bash
git add components/tools/mortgage/ResultsSummary.tsx components/tools/mortgage/ResultsSummary.test.tsx
git commit -m "Render named split breakdown in ResultsSummary, replacing hardcoded Per Person tile"
```

---

### Task 13: Wire the mortgage page's new props

**Files:**
- Modify: `app/tools/mortgage/page.tsx`
- Modify: `app/tools/mortgage/page.test.tsx`

**Interfaces:**
- Consumes: `members`, `displaySplitBreakdown` from `useMortgageCalculator` (Task 10); `members` prop on `MortgageForm` (Task 11); `splitBreakdown` prop on `ResultsSummary` (Task 12)

- [ ] **Step 1: Add a failing integration test to `page.test.tsx`**

Add this test to the existing `describe('MortgageCalculatorPage', ...)` block, alongside the existing three tests (do not remove them):

```tsx
// app/tools/mortgage/page.test.tsx — add this test, keep the existing ones and imports as-is
it('shows a named split once a household of two or more exists and is selected', async () => {
  localStorage.setItem(
    'finance-tools-household',
    JSON.stringify([
      { id: 'a', name: 'Alex', income: 100000 },
      { id: 'b', name: 'Sam', income: 50000 },
    ]),
  )

  render(<MortgageCalculatorPage />)

  await userEvent.type(await screen.findByLabelText('Property Price'), '500000')
  await userEvent.type(screen.getByLabelText('Your Deposit'), '100000')
  await userEvent.type(screen.getByLabelText('Interest Rate (% p.a.)'), '6')

  await userEvent.click(await screen.findByLabelText('Alex'))
  await userEvent.click(screen.getByLabelText('Sam'))

  // "Alex"/"Sam" now appear twice each: once as a checkbox label (MortgageForm) and once as
  // a split stat label (ResultsSummary) — assert on the count rather than a single match.
  expect(await screen.findByText('Split')).toBeInTheDocument()
  expect(screen.getAllByText('Alex').length).toBeGreaterThanOrEqual(2)
  expect(screen.getAllByText('Sam').length).toBeGreaterThanOrEqual(2)
})
```

- [ ] **Step 2: Run tests to verify the new one fails**

Run: `npx vitest run app/tools/mortgage/page.test.tsx`
Expected: FAIL — `MortgageForm`/`ResultsSummary` in `page.tsx` don't yet receive `members`/`splitBreakdown`, so no split checkboxes or "Split" heading render

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
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run app/tools/mortgage/page.test.tsx`
Expected: PASS (all 4 tests)

- [ ] **Step 5: Commit**

```bash
git add app/tools/mortgage/page.tsx app/tools/mortgage/page.test.tsx
git commit -m "Wire household members and split display into the mortgage page"
```

---

### Task 14: Dashboard data hook

**Files:**
- Create: `components/dashboard/useDashboardData.ts`
- Create: `components/dashboard/useDashboardData.test.ts`

**Interfaces:**
- Consumes: `useHousehold` from `@/components/household` (Task 4), `loadMortgageData` from `@/lib/storage` (existing), `calculateMortgageResults` from `@/lib/calculations/mortgage` (Task 8)
- Produces: `useDashboardData(): { members: HouseholdMember[]; mortgageResults: MortgageResults | null }` — consumed by Task 16 (`app/page.tsx`)

- [ ] **Step 1: Write the failing tests**

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
  it('returns no mortgage results when nothing has been saved', async () => {
    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.members).toEqual([]))
    expect(result.current.mortgageResults).toBeNull()
  })

  it('returns household members loaded from the repository', async () => {
    localStorage.setItem(
      'finance-tools-household',
      JSON.stringify([{ id: '1', name: 'Rafael', income: 95000 }]),
    )
    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.members).toHaveLength(1))
  })

  it('computes mortgage results from saved inputs, once loan details exist', async () => {
    localStorage.setItem('finance-tools-mortgage-inputs', JSON.stringify(savedInputs))
    localStorage.setItem('finance-tools-mortgage-expenses', JSON.stringify([]))

    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.mortgageResults).not.toBeNull())
    expect(result.current.mortgageResults!.monthlyMortgagePayment).toBeGreaterThan(0)
  })

  it('leaves mortgage results null when saved inputs have no loan amount', async () => {
    localStorage.setItem(
      'finance-tools-mortgage-inputs',
      JSON.stringify({ ...savedInputs, loanAmount: 0 }),
    )
    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.members).toEqual([]))
    expect(result.current.mortgageResults).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run components/dashboard/useDashboardData.test.ts`
Expected: FAIL with "Cannot find module './useDashboardData'"

- [ ] **Step 3: Write the implementation**

```ts
// components/dashboard/useDashboardData.ts
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
    const saved = loadMortgageData()
    if (saved && saved.inputs.loanAmount > 0) {
      setMortgageResults(calculateMortgageResults(saved.inputs, saved.expenses, members))
    } else {
      setMortgageResults(null)
    }
  }, [members])

  return { members, mortgageResults }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run components/dashboard/useDashboardData.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/useDashboardData.ts components/dashboard/useDashboardData.test.ts
git commit -m "Add useDashboardData hook"
```

---

### Task 15: Dashboard cards

**Files:**
- Create: `components/dashboard/HouseholdSummaryCard.tsx`
- Create: `components/dashboard/HouseholdSummaryCard.test.tsx`
- Create: `components/dashboard/MortgageSnapshotCard.tsx`
- Create: `components/dashboard/MortgageSnapshotCard.test.tsx`
- Create: `components/dashboard/BudgetPlaceholderCard.tsx`
- Create: `components/dashboard/BudgetPlaceholderCard.test.tsx`
- Create: `components/dashboard/index.ts`

**Interfaces:**
- Consumes: `HouseholdMember` from `@/types/household` (Task 1), `formatCompactIncome` from `@/lib/calculations/household` (Task 3), `MortgageResults` from `@/types/mortgage` (Task 8), `formatCurrencyPrecise` from `@/lib/calculations/mortgage` (existing)
- Produces: `HouseholdSummaryCard`, `MortgageSnapshotCard`, `BudgetPlaceholderCard`, barrel-exported alongside `useDashboardData` — consumed by Task 16 (`app/page.tsx`)

- [ ] **Step 1: Write the failing test for `HouseholdSummaryCard`**

```tsx
// components/dashboard/HouseholdSummaryCard.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HouseholdSummaryCard } from './HouseholdSummaryCard'
import { HouseholdMember } from '@/types/household'

describe('HouseholdSummaryCard', () => {
  it('shows a call to action when there are no members', () => {
    render(<HouseholdSummaryCard members={[]} />)
    expect(screen.getByText('Set up your household to get started.')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/profile')
  })

  it('shows member count and combined income when members exist', () => {
    const members: HouseholdMember[] = [
      { id: '1', name: 'Rafael', income: 95000 },
      { id: '2', name: 'Partner', income: 80000 },
    ]
    render(<HouseholdSummaryCard members={members} />)
    expect(screen.getByText('2 members · $175k/yr')).toBeInTheDocument()
    expect(screen.getByText('Rafael, Partner')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/profile')
  })

  it('uses singular wording for a single member', () => {
    const members: HouseholdMember[] = [{ id: '1', name: 'Rafael', income: 95000 }]
    render(<HouseholdSummaryCard members={members} />)
    expect(screen.getByText('1 member · $95k/yr')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/dashboard/HouseholdSummaryCard.test.tsx`
Expected: FAIL with "Cannot find module './HouseholdSummaryCard'"

- [ ] **Step 3: Write the `HouseholdSummaryCard` implementation**

```tsx
// components/dashboard/HouseholdSummaryCard.tsx
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, WalletIcon } from '@/components/ui'
import { HouseholdMember } from '@/types/household'
import { formatCompactIncome } from '@/lib/calculations/household'

interface HouseholdSummaryCardProps {
  members: HouseholdMember[]
}

export function HouseholdSummaryCard({ members }: HouseholdSummaryCardProps) {
  if (members.length === 0) {
    return (
      <Link href="/profile" className="block group">
        <Card
          className={`
            h-full border-dashed transition-colors hover:border-accent/50
          `}
        >
          <CardHeader>
            <CardTitle
              className={`
                flex items-center gap-2 text-muted
                group-hover:text-accent transition-colors
              `}
            >
              <WalletIcon width="20" height="20" />
              Household
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted">Set up your household to get started.</p>
          </CardContent>
        </Card>
      </Link>
    )
  }

  const combinedIncome = members.reduce((total, member) => total + member.income, 0)

  return (
    <Link href="/profile" className="block group">
      <Card className="h-full transition-colors hover:border-accent/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 group-hover:text-accent transition-colors">
            <WalletIcon width="20" height="20" className="text-accent" />
            Household
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground font-medium">
            {members.length} member{members.length === 1 ? '' : 's'} ·{' '}
            {formatCompactIncome(combinedIncome)}/yr
          </p>
          <p className="text-sm text-muted mt-1">
            {members.map((member) => member.name).join(', ')}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/dashboard/HouseholdSummaryCard.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the failing test for `MortgageSnapshotCard`**

```tsx
// components/dashboard/MortgageSnapshotCard.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MortgageSnapshotCard } from './MortgageSnapshotCard'
import { MortgageResults } from '@/types/mortgage'

const results: MortgageResults = {
  principalAmount: 400000,
  repaymentAmount: 2400,
  repaymentFrequency: 'monthly',
  totalRepayments: 864000,
  totalInterest: 464000,
  payoffDate: new Date('2042-06-01'),
  monthlyMortgagePayment: 2340,
  monthlyExpensesTotal: 300,
  totalMonthlyOutgoing: 2640,
  splitBreakdown: [],
  amortisationSchedule: [],
}

describe('MortgageSnapshotCard', () => {
  it('shows a call to action when there are no results', () => {
    render(<MortgageSnapshotCard results={null} />)
    expect(screen.getByText('Get started with the mortgage calculator.')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/tools/mortgage')
  })

  it('shows the monthly payment and payoff year when results exist', () => {
    render(<MortgageSnapshotCard results={results} />)
    expect(screen.getByText('$2,340.00/mo')).toBeInTheDocument()
    expect(screen.getByText('Payoff 2042')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/tools/mortgage')
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run components/dashboard/MortgageSnapshotCard.test.tsx`
Expected: FAIL with "Cannot find module './MortgageSnapshotCard'"

- [ ] **Step 7: Write the `MortgageSnapshotCard` implementation**

```tsx
// components/dashboard/MortgageSnapshotCard.tsx
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, HouseIcon } from '@/components/ui'
import { MortgageResults } from '@/types/mortgage'
import { formatCurrencyPrecise } from '@/lib/calculations/mortgage'

interface MortgageSnapshotCardProps {
  results: MortgageResults | null
}

export function MortgageSnapshotCard({ results }: MortgageSnapshotCardProps) {
  if (!results) {
    return (
      <Link href="/tools/mortgage" className="block group">
        <Card className="h-full border-dashed transition-colors hover:border-accent/50">
          <CardHeader>
            <CardTitle
              className={`
                flex items-center gap-2 text-muted
                group-hover:text-accent transition-colors
              `}
            >
              <HouseIcon width="20" height="20" />
              Mortgage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted">Get started with the mortgage calculator.</p>
          </CardContent>
        </Card>
      </Link>
    )
  }

  return (
    <Link href="/tools/mortgage" className="block group">
      <Card className="h-full transition-colors hover:border-accent/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 group-hover:text-accent transition-colors">
            <HouseIcon width="20" height="20" className="text-accent" />
            Mortgage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground font-medium">
            {formatCurrencyPrecise(results.monthlyMortgagePayment)}/mo
          </p>
          <p className="text-sm text-muted mt-1">
            Payoff {results.payoffDate.toLocaleDateString('en-AU', { year: 'numeric' })}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run components/dashboard/MortgageSnapshotCard.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 9: Write the failing test for `BudgetPlaceholderCard`**

```tsx
// components/dashboard/BudgetPlaceholderCard.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BudgetPlaceholderCard } from './BudgetPlaceholderCard'

describe('BudgetPlaceholderCard', () => {
  it('renders a disabled-looking placeholder', () => {
    render(<BudgetPlaceholderCard />)
    expect(screen.getByText('Budget Planner')).toBeInTheDocument()
    expect(screen.getByText('Coming soon.')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npx vitest run components/dashboard/BudgetPlaceholderCard.test.tsx`
Expected: FAIL with "Cannot find module './BudgetPlaceholderCard'"

- [ ] **Step 11: Write the `BudgetPlaceholderCard` implementation**

```tsx
// components/dashboard/BudgetPlaceholderCard.tsx
import { Card, CardHeader, CardTitle, CardContent, PlusCircleIcon } from '@/components/ui'

export function BudgetPlaceholderCard() {
  return (
    <Card className="h-full border-dashed opacity-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-muted">
          <PlusCircleIcon width="20" height="20" />
          Budget Planner
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted">Coming soon.</p>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npx vitest run components/dashboard/BudgetPlaceholderCard.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 13: Write the barrel export**

```ts
// components/dashboard/index.ts
export { HouseholdSummaryCard } from './HouseholdSummaryCard'
export { MortgageSnapshotCard } from './MortgageSnapshotCard'
export { BudgetPlaceholderCard } from './BudgetPlaceholderCard'
export { useDashboardData } from './useDashboardData'
```

- [ ] **Step 14: Commit**

```bash
git add components/dashboard/
git commit -m "Add dashboard summary cards"
```

---

### Task 16: Rewrite the dashboard home page

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/page.test.tsx`

**Interfaces:**
- Consumes: `HouseholdSummaryCard`, `MortgageSnapshotCard`, `BudgetPlaceholderCard`, `useDashboardData` from `@/components/dashboard` (Tasks 14-15)

- [ ] **Step 1: Replace `app/page.test.tsx` with the new dashboard behavior**

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
  it('shows empty-state CTAs for household and mortgage when nothing is configured', async () => {
    render(<HomePage />)
    expect(
      await screen.findByText('Set up your household to get started.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Get started with the mortgage calculator.')).toBeInTheDocument()
  })

  it('shows the household summary once members are configured', async () => {
    localStorage.setItem(
      'finance-tools-household',
      JSON.stringify([{ id: '1', name: 'Rafael', income: 95000 }]),
    )
    render(<HomePage />)
    expect(await screen.findByText('1 member · $95k/yr')).toBeInTheDocument()
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
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run app/page.test.tsx`
Expected: FAIL — `app/page.tsx` still renders the old card grid, none of the new text is present

- [ ] **Step 3: Rewrite `app/page.tsx`**

```tsx
// app/page.tsx
'use client'

import {
  HouseholdSummaryCard,
  MortgageSnapshotCard,
  BudgetPlaceholderCard,
  useDashboardData,
} from '@/components/dashboard'

export default function HomePage() {
  const { members, mortgageResults } = useDashboardData()

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <HouseholdSummaryCard members={members} />
          <MortgageSnapshotCard results={mortgageResults} />
          <BudgetPlaceholderCard />
        </div>
      </main>

      <footer className="border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
        </div>
      </footer>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run app/page.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Run the full test suite, lint, and format check**

Run: `npm run test`
Expected: PASS — every test file in the project passes

Run: `npm run lint`
Expected: no errors

Run: `npm run format`
Expected: no files need reformatting (or reformats cleanly with no behavioral diff)

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx app/page.test.tsx
git commit -m "Replace card-grid home page with a household + mortgage dashboard"
```

---

## Final verification

- [ ] Run `npm run build` to confirm the production build succeeds with the new routes (`/`, `/profile`, `/tools/mortgage`) and no type errors.
- [ ] Manually click through: `/` (empty state) → `/profile` (add two members) → `/` (household card populated) → `/tools/mortgage` (enter loan details, select both members, toggle even/income split, confirm the "Split" section updates) → Share → open the generated link in a new tab and confirm the frozen split names/amounts appear before any edit, and recompute after an edit.
