# Household-Level Split Config & Member List Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move cost-split configuration (which household members share costs, evenly or by
income) off the mortgage tool and onto the household page as one shared setting, and clean up
the household member list's layout.

**Architecture:** `HouseholdSplitConfig` becomes a new piece of state owned by
`lib/household`/`useHousehold()`, following the exact same repository + hook shape already used
for members. A new `SplitConfigCard` renders it on `/profile`. `MortgageInputs` and every caller
of `calculateMortgageResults` drop their own `splitMemberIds`/`splitMode` and read the shared
config from `useHousehold()` instead.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4, Vitest +
React Testing Library, no backend (client-side/localStorage only).

## Global Constraints

- Prettier: single quotes, no semicolons, trailing commas everywhere, printWidth 100, tabWidth 2
  — run `npm run format` before each commit if unsure.
- Reuse `components/ui/` primitives (`Card`, `CardHeader`, `CardTitle`, `CardContent`, `Button`,
  `Checkbox`) — no raw `<button>`/`<input>`/inline SVGs.
- Pure calculation logic stays in `lib/calculations/`, free of React/UI concerns.
- `lib/household/` is a persistence-layer template: `repository.ts` interface,
  `local*Repository.ts` implementation, barrel `index.ts` exporting a singleton — new split-config
  storage follows this same shape, not a separate module.
- Every new/changed component or hook gets a test in the same pass (this repo's stated
  expectation — coverage for everything, not just the tricky bits).

---

### Task 1: Household split-config data layer

**Files:**
- Modify: `types/household.ts`
- Modify: `lib/household/repository.ts`
- Modify: `lib/household/localStorageRepository.ts`
- Test: `lib/household/localStorageRepository.test.ts`

**Interfaces:**
- Produces: `HouseholdSplitConfig { memberIds: string[]; mode: SplitMode }` (in
  `types/household.ts`); `HouseholdRepository.getSplitConfig(): Promise<HouseholdSplitConfig |
null>` and `saveSplitConfig(config: HouseholdSplitConfig): Promise<void>`. `null` from
  `getSplitConfig` means "never saved" (distinct from an explicitly-saved empty config) — later
  tasks rely on this to know when auto-seeding is allowed.

- [ ] **Step 1: Write the failing tests**

Add to `lib/household/localStorageRepository.test.ts` (below the existing `members` describe
block):

```ts
describe('LocalStorageHouseholdRepository split config', () => {
  it('returns null when no split config has been saved', async () => {
    const repo = new LocalStorageHouseholdRepository()
    expect(await repo.getSplitConfig()).toBeNull()
  })

  it('round-trips a split config through localStorage', async () => {
    const repo = new LocalStorageHouseholdRepository()
    const config = { memberIds: ['1', '2'], mode: 'income' as const }
    await repo.saveSplitConfig(config)
    expect(await repo.getSplitConfig()).toEqual(config)
  })

  it('returns null if the stored split config is corrupt', async () => {
    localStorage.setItem('finance-tools-household-split', 'not-json')
    const repo = new LocalStorageHouseholdRepository()
    expect(await repo.getSplitConfig()).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/household/localStorageRepository.test.ts`
Expected: FAIL — `repo.getSplitConfig is not a function`

- [ ] **Step 3: Implement the type and repository interface**

Replace `types/household.ts` with:

```ts
export interface HouseholdMember {
  id: string
  name: string
  income: number
}

export type SplitMode = 'even' | 'income'

export interface HouseholdSplitConfig {
  memberIds: string[]
  mode: SplitMode
}
```

Replace `lib/household/repository.ts` with:

```ts
import { HouseholdMember, HouseholdSplitConfig } from '@/types/household'

export interface HouseholdRepository {
  getMembers(): Promise<HouseholdMember[]>
  saveMembers(members: HouseholdMember[]): Promise<void>
  getSplitConfig(): Promise<HouseholdSplitConfig | null>
  saveSplitConfig(config: HouseholdSplitConfig): Promise<void>
}
```

- [ ] **Step 4: Implement the localStorage-backed methods**

Replace `lib/household/localStorageRepository.ts` with:

```ts
import { HouseholdMember, HouseholdSplitConfig } from '@/types/household'
import { HouseholdRepository } from './repository'

const STORAGE_KEY = 'finance-tools-household'
const SPLIT_STORAGE_KEY = 'finance-tools-household-split'

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

  async getSplitConfig(): Promise<HouseholdSplitConfig | null> {
    try {
      const json = localStorage.getItem(SPLIT_STORAGE_KEY)
      return json ? JSON.parse(json) : null
    } catch (error) {
      console.error('Failed to load split config from localStorage:', error)
      return null
    }
  }

  async saveSplitConfig(config: HouseholdSplitConfig): Promise<void> {
    try {
      localStorage.setItem(SPLIT_STORAGE_KEY, JSON.stringify(config))
    } catch (error) {
      console.error('Failed to save split config to localStorage:', error)
    }
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run lib/household/localStorageRepository.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add types/household.ts lib/household/repository.ts lib/household/localStorageRepository.ts lib/household/localStorageRepository.test.ts
git commit -m "Add household split-config storage layer"
```

---

### Task 2: `useHousehold` hook — split config load/save/seed

**Files:**
- Modify: `components/household/useHousehold.ts`
- Test: `components/household/useHousehold.test.ts`

**Interfaces:**
- Consumes: `householdRepository.getSplitConfig`/`saveSplitConfig` (Task 1)
- Produces: `useHousehold()` additionally returns `splitConfig: HouseholdSplitConfig`,
  `toggleSplitMember(memberId: string, included: boolean): void`, `setSplitMode(mode: SplitMode):
void`

- [ ] **Step 1: Write the failing tests**

Add to `components/household/useHousehold.test.ts` (inside the existing `describe('useHousehold'`
block, after the last `it`):

```ts
  it('starts with an empty split config until loaded', async () => {
    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.splitConfig).toEqual({ memberIds: [], mode: 'even' })
  })

  it('loads a saved split config from localStorage on mount', async () => {
    localStorage.setItem(
      'finance-tools-household-split',
      JSON.stringify({ memberIds: ['1'], mode: 'income' }),
    )
    const { result } = renderHook(() => useHousehold())
    await waitFor(() =>
      expect(result.current.splitConfig).toEqual({ memberIds: ['1'], mode: 'income' }),
    )
  })

  it('toggles a member in and out of the split', async () => {
    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    act(() => {
      result.current.toggleSplitMember('1', true)
    })
    expect(result.current.splitConfig.memberIds).toEqual(['1'])

    act(() => {
      result.current.toggleSplitMember('1', false)
    })
    expect(result.current.splitConfig.memberIds).toEqual([])
  })

  it('sets the split mode', async () => {
    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    act(() => {
      result.current.setSplitMode('income')
    })
    expect(result.current.splitConfig.mode).toBe('income')
  })

  it('persists split config changes to localStorage', async () => {
    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    act(() => {
      result.current.toggleSplitMember('1', true)
    })

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('finance-tools-household-split') || '{}')
      expect(stored.memberIds).toEqual(['1'])
    })
  })

  it('auto-selects every member once there are 2+ and split config has never been saved', async () => {
    localStorage.setItem(
      'finance-tools-household',
      JSON.stringify([
        { id: 'a', name: 'Alex', income: 100000 },
        { id: 'b', name: 'Sam', income: 50000 },
      ]),
    )
    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.splitConfig.memberIds).toEqual(['a', 'b']))
  })

  it('does not re-seed the split after a previously saved config, even an empty one', async () => {
    localStorage.setItem(
      'finance-tools-household',
      JSON.stringify([
        { id: 'a', name: 'Alex', income: 100000 },
        { id: 'b', name: 'Sam', income: 50000 },
      ]),
    )
    localStorage.setItem(
      'finance-tools-household-split',
      JSON.stringify({ memberIds: [], mode: 'even' }),
    )
    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.splitConfig.memberIds).toEqual([])
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run components/household/useHousehold.test.ts`
Expected: FAIL — `result.current.splitConfig` is `undefined` / `toggleSplitMember is not a
function`

- [ ] **Step 3: Implement the hook changes**

Replace `components/household/useHousehold.ts` with:

```ts
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { HouseholdMember, HouseholdSplitConfig, SplitMode } from '@/types/household'
import { householdRepository } from '@/lib/household'

const HOUSEHOLD_UPDATED_EVENT = 'household-updated'
const DEFAULT_SPLIT_CONFIG: HouseholdSplitConfig = { memberIds: [], mode: 'even' }

export function useHousehold() {
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [splitConfig, setSplitConfigState] = useState<HouseholdSplitConfig>(DEFAULT_SPLIT_CONFIG)
  const [isLoaded, setIsLoaded] = useState(false)
  const unmountedRef = useRef(false)
  // getMembers()/getSplitConfig() always return fresh references (JSON.parse), so every load —
  // including one triggered by this instance's own dispatch below — changes their identity.
  // Without these guards the persist effects would re-fire after every load, re-save, and
  // re-dispatch forever. Each ref marks "this update came from a load, not a local mutation" so
  // its persist effect can skip re-persisting/re-notifying for it exactly once. Members and split
  // config get separate refs since a single load updates both but a local edit only touches one.
  const skipMembersNotifyRef = useRef(false)
  const skipSplitNotifyRef = useRef(false)
  // True until the first load resolves a real (non-null) saved split config — distinguishes
  // "never configured" from "configured as empty" so the auto-seed effect below fires at most
  // once, on genuinely first use, and never re-applies after a deliberate "select nobody".
  const neverConfiguredRef = useRef(true)
  const hasSeededSplitRef = useRef(false)

  // Load on mount, and again whenever any instance saves a change — so a component that stays
  // mounted across navigations (e.g. the persistent nav's ProfileMenu) picks up edits made
  // elsewhere (e.g. on /profile) in the same session instead of showing stale data until reload.
  useEffect(() => {
    unmountedRef.current = false

    const load = () => {
      Promise.all([householdRepository.getMembers(), householdRepository.getSplitConfig()]).then(
        ([loadedMembers, loadedSplitConfig]) => {
          if (!unmountedRef.current) {
            skipMembersNotifyRef.current = true
            skipSplitNotifyRef.current = true
            neverConfiguredRef.current = loadedSplitConfig === null
            setMembers(loadedMembers)
            setSplitConfigState(loadedSplitConfig ?? DEFAULT_SPLIT_CONFIG)
            setIsLoaded(true)
          }
        },
      )
    }

    load()
    window.addEventListener(HOUSEHOLD_UPDATED_EVENT, load)
    return () => {
      unmountedRef.current = true
      window.removeEventListener(HOUSEHOLD_UPDATED_EVENT, load)
    }
  }, [])

  // Persist members to the repository whenever they change locally, once loaded, and notify
  // other instances — but skip it for updates that came from a load (mount or cross-instance
  // sync), otherwise re-saving the just-loaded data would re-dispatch and loop forever.
  useEffect(() => {
    if (!isLoaded) return
    if (skipMembersNotifyRef.current) {
      skipMembersNotifyRef.current = false
      return
    }
    householdRepository.saveMembers(members)
    window.dispatchEvent(new Event(HOUSEHOLD_UPDATED_EVENT))
  }, [members, isLoaded])

  // Same persist-and-notify pattern as members, for the split config.
  useEffect(() => {
    if (!isLoaded) return
    if (skipSplitNotifyRef.current) {
      skipSplitNotifyRef.current = false
      return
    }
    householdRepository.saveSplitConfig(splitConfig)
    window.dispatchEvent(new Event(HOUSEHOLD_UPDATED_EVENT))
  }, [splitConfig, isLoaded])

  // Default to splitting between every household member the first time there are 2+ and split
  // config has never been saved before. Guarded so it fires at most once per mount and never
  // re-applies after any explicit save (including a deliberate "select nobody").
  useEffect(() => {
    if (
      !hasSeededSplitRef.current &&
      isLoaded &&
      neverConfiguredRef.current &&
      members.length >= 2 &&
      splitConfig.memberIds.length === 0
    ) {
      hasSeededSplitRef.current = true
      setSplitConfigState((current) => ({ ...current, memberIds: members.map((m) => m.id) }))
    }
  }, [isLoaded, members, splitConfig.memberIds])

  const addMember = useCallback(() => {
    setMembers((current) => [...current, { id: crypto.randomUUID(), name: '', income: 0 }])
  }, [])

  const updateMember = useCallback((updated: HouseholdMember) => {
    setMembers((current) => current.map((member) => (member.id === updated.id ? updated : member)))
  }, [])

  const removeMember = useCallback((id: string) => {
    setMembers((current) => current.filter((member) => member.id !== id))
  }, [])

  const toggleSplitMember = useCallback((memberId: string, included: boolean) => {
    setSplitConfigState((current) => ({
      ...current,
      memberIds: included
        ? [...current.memberIds, memberId]
        : current.memberIds.filter((id) => id !== memberId),
    }))
  }, [])

  const setSplitMode = useCallback((mode: SplitMode) => {
    setSplitConfigState((current) => ({ ...current, mode }))
  }, [])

  return {
    members,
    splitConfig,
    isLoaded,
    addMember,
    updateMember,
    removeMember,
    toggleSplitMember,
    setSplitMode,
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run components/household/useHousehold.test.ts`
Expected: PASS (all tests, including the pre-existing member ones)

- [ ] **Step 5: Commit**

```bash
git add components/household/useHousehold.ts components/household/useHousehold.test.ts
git commit -m "Add split-config state, persistence, and auto-seed to useHousehold"
```

---

### Task 3: `SplitConfigCard` component

**Files:**
- Create: `components/household/SplitConfigCard.tsx`
- Test: `components/household/SplitConfigCard.test.tsx`
- Modify: `components/household/index.ts`

**Interfaces:**
- Consumes: `HouseholdMember[]`, `SplitMode` (`types/household.ts`); `Card`, `CardHeader`,
  `CardTitle`, `CardContent`, `Button`, `Checkbox`, `PieChartIcon` (`@/components/ui`)
- Produces: `SplitConfigCard({ members, splitMemberIds, splitMode, onToggleMember, onModeChange
}: SplitConfigCardProps)` — renders `null` when `members.length < 2`

- [ ] **Step 1: Write the failing test**

Create `components/household/SplitConfigCard.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SplitConfigCard } from './SplitConfigCard'
import { HouseholdMember } from '@/types/household'

describe('SplitConfigCard', () => {
  it('renders nothing with fewer than two members', () => {
    const oneMember: HouseholdMember[] = [{ id: 'a', name: 'Alex', income: 100000 }]
    const { container } = render(
      <SplitConfigCard
        members={oneMember}
        splitMemberIds={[]}
        splitMode="even"
        onToggleMember={() => {}}
        onModeChange={() => {}}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows a checkbox per member and calls onToggleMember', async () => {
    const onToggleMember = vi.fn()
    const members: HouseholdMember[] = [
      { id: 'a', name: 'Alex', income: 100000 },
      { id: 'b', name: 'Sam', income: 50000 },
    ]
    render(
      <SplitConfigCard
        members={members}
        splitMemberIds={['a']}
        splitMode="even"
        onToggleMember={onToggleMember}
        onModeChange={() => {}}
      />,
    )

    expect(screen.getByLabelText('Alex')).toBeChecked()
    expect(screen.getByLabelText('Sam')).not.toBeChecked()

    await userEvent.click(screen.getByLabelText('Sam'))
    expect(onToggleMember).toHaveBeenCalledWith('b', true)
  })

  it('calls onModeChange when the split mode toggle is clicked', async () => {
    const onModeChange = vi.fn()
    const members: HouseholdMember[] = [
      { id: 'a', name: 'Alex', income: 100000 },
      { id: 'b', name: 'Sam', income: 50000 },
    ]
    render(
      <SplitConfigCard
        members={members}
        splitMemberIds={[]}
        splitMode="even"
        onToggleMember={() => {}}
        onModeChange={onModeChange}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Split by income' }))
    expect(onModeChange).toHaveBeenCalledWith('income')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/household/SplitConfigCard.test.tsx`
Expected: FAIL — cannot find module `./SplitConfigCard`

- [ ] **Step 3: Implement the component**

Create `components/household/SplitConfigCard.tsx`:

```tsx
'use client'

import { Card, CardHeader, CardTitle, CardContent, Button, Checkbox, PieChartIcon } from '@/components/ui'
import { HouseholdMember, SplitMode } from '@/types/household'

interface SplitConfigCardProps {
  members: HouseholdMember[]
  splitMemberIds: string[]
  splitMode: SplitMode
  onToggleMember: (memberId: string, included: boolean) => void
  onModeChange: (mode: SplitMode) => void
}

export function SplitConfigCard({
  members,
  splitMemberIds,
  splitMode,
  onToggleMember,
  onModeChange,
}: SplitConfigCardProps) {
  if (members.length < 2) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon width="20" height="20" className="text-accent" />
          Cost Splitting
        </CardTitle>
        <p className="text-sm text-muted mt-1">
          Choose who shares costs across tools, and how to split them.
        </p>
      </CardHeader>
      <CardContent>
        <p className="text-sm font-medium text-foreground mb-3">Split between:</p>
        <div className="flex flex-wrap gap-4 mb-4">
          {members.map((member) => (
            <Checkbox
              key={member.id}
              id={`split-member-${member.id}`}
              label={member.name || 'Unnamed'}
              checked={splitMemberIds.includes(member.id)}
              onChange={(e) => onToggleMember(member.id, e.target.checked)}
            />
          ))}
        </div>
        <div className="inline-flex rounded-lg border border-border overflow-hidden">
          <Button
            type="button"
            variant={splitMode === 'even' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => onModeChange('even')}
            className="rounded-none"
          >
            Split evenly
          </Button>
          <Button
            type="button"
            variant={splitMode === 'income' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => onModeChange('income')}
            className="rounded-none"
          >
            Split by income
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

Update `components/household/index.ts` to:

```ts
export { MemberItem } from './MemberItem'
export { MemberList } from './MemberList'
export { SplitConfigCard } from './SplitConfigCard'
export { useHousehold } from './useHousehold'
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run components/household/SplitConfigCard.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add components/household/SplitConfigCard.tsx components/household/SplitConfigCard.test.tsx components/household/index.ts
git commit -m "Add SplitConfigCard component"
```

---

### Task 4: Wire `SplitConfigCard` into the household page

**Files:**
- Modify: `app/profile/page.tsx`
- Test: `app/profile/page.test.tsx`

**Interfaces:**
- Consumes: `useHousehold()`'s `splitConfig`, `toggleSplitMember`, `setSplitMode` (Task 2);
  `SplitConfigCard` (Task 3)

- [ ] **Step 1: Write the failing test**

Add to `app/profile/page.test.tsx` (inside the existing `describe('ProfilePage'` block):

```tsx
  it('shows the split config card once two members exist', async () => {
    render(<ProfilePage />)
    await screen.findByText('No household members added yet.')

    await userEvent.click(screen.getByRole('button', { name: 'Add member' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add member' }))

    expect(await screen.findByText('Cost Splitting')).toBeInTheDocument()
  })

  it('does not show the split config card with fewer than two members', async () => {
    render(<ProfilePage />)
    await screen.findByText('No household members added yet.')

    await userEvent.click(screen.getByRole('button', { name: 'Add member' }))

    expect(screen.queryByText('Cost Splitting')).not.toBeInTheDocument()
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run app/profile/page.test.tsx`
Expected: FAIL — "Cost Splitting" text not found

- [ ] **Step 3: Wire the card into the page**

Replace `app/profile/page.tsx` with:

```tsx
'use client'

import { MemberList, SplitConfigCard, useHousehold } from '@/components/household'
import { PageContainer } from '@/components/layout'

export default function ProfilePage() {
  const {
    members,
    splitConfig,
    addMember,
    updateMember,
    removeMember,
    toggleSplitMember,
    setSplitMode,
  } = useHousehold()

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
        <PageContainer className="py-8 space-y-6">
          <MemberList
            members={members}
            onAdd={addMember}
            onChange={updateMember}
            onRemove={removeMember}
          />
          <SplitConfigCard
            members={members}
            splitMemberIds={splitConfig.memberIds}
            splitMode={splitConfig.mode}
            onToggleMember={toggleSplitMember}
            onModeChange={setSplitMode}
          />
        </PageContainer>
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run app/profile/page.test.tsx`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add app/profile/page.tsx app/profile/page.test.tsx
git commit -m "Render SplitConfigCard on the household page"
```

---

### Task 5: Decouple split fields from `MortgageInputs` in the calculation/storage layer

**Files:**
- Modify: `types/mortgage.ts`
- Modify: `lib/calculations/mortgage.ts`
- Modify: `lib/storage.ts`
- Modify: `components/dashboard/useDashboardData.ts`
- Test: `lib/calculations/mortgage.test.ts`
- Test: `lib/storage.test.ts`
- Test: `components/dashboard/useDashboardData.test.ts`

**Interfaces:**
- Consumes: `HouseholdSplitConfig` (`types/household.ts`, Task 1)
- Produces: `MortgageInputs` without `splitMemberIds`/`splitMode`;
  `calculateMortgageResults(inputs: MortgageInputs, expenses: Expense[], members:
HouseholdMember[], splitConfig: HouseholdSplitConfig): MortgageResults` — this is the new
  signature every caller must use from here on.

- [ ] **Step 1: Update `mortgage.test.ts` calls to the new signature (write first, expect fail)**

In `lib/calculations/mortgage.test.ts`, remove `splitMemberIds: [], splitMode: 'even',` from
`baseInputs`, then update the `calculateMortgageResults` describe block's calls:

```ts
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
  }
  const noSplit = { memberIds: [], mode: 'even' as const }

  it('derives principal as loan amount minus deposit', () => {
    const results = calculateMortgageResults(baseInputs, [], [], noSplit)
    expect(results.principalAmount).toBe(500000)
  })

  it('reduces the effective principal by the offset balance', () => {
    const withOffset = calculateMortgageResults(
      { ...baseInputs, offsetBalance: 50000 },
      [],
      [],
      noSplit,
    )
    const withoutOffset = calculateMortgageResults(baseInputs, [], [], noSplit)
    expect(withOffset.repaymentAmount).toBeLessThan(withoutOffset.repaymentAmount)
  })

  it('sums monthly expenses onto the mortgage payment', () => {
    const expenses: Expense[] = [
      { id: '1', name: 'Rates', amount: 300, frequency: 'quarterly' },
      { id: '2', name: 'Insurance', amount: 1200, frequency: 'annually' },
    ]
    const results = calculateMortgageResults(baseInputs, expenses, [], noSplit)

    expect(results.monthlyExpensesTotal).toBeCloseTo(100 + 100)
    expect(results.totalMonthlyOutgoing).toBeCloseTo(
      results.monthlyMortgagePayment + results.monthlyExpensesTotal,
    )
  })

  it('produces no split breakdown when fewer than two members are selected', () => {
    const members: HouseholdMember[] = [{ id: 'a', name: 'Alex', income: 100000 }]
    const results = calculateMortgageResults(baseInputs, [], members, { memberIds: ['a'], mode: 'even' })
    expect(results.splitBreakdown).toEqual([])
  })

  it('splits the total monthly outgoing evenly across selected members', () => {
    const members: HouseholdMember[] = [
      { id: 'a', name: 'Alex', income: 100000 },
      { id: 'b', name: 'Sam', income: 50000 },
    ]
    const results = calculateMortgageResults(baseInputs, [], members, {
      memberIds: ['a', 'b'],
      mode: 'even',
    })
    expect(results.splitBreakdown).toHaveLength(2)
    expect(results.splitBreakdown[0].amount).toBeCloseTo(results.totalMonthlyOutgoing / 2)
    expect(results.splitBreakdown[1].amount).toBeCloseTo(results.totalMonthlyOutgoing / 2)
  })

  it('splits the total monthly outgoing by income when mode is income', () => {
    const members: HouseholdMember[] = [
      { id: 'a', name: 'Alex', income: 100000 },
      { id: 'b', name: 'Sam', income: 50000 },
    ]
    const results = calculateMortgageResults(baseInputs, [], members, {
      memberIds: ['a', 'b'],
      mode: 'income',
    })
    const alex = results.splitBreakdown.find((entry) => entry.memberId === 'a')!
    const sam = results.splitBreakdown.find((entry) => entry.memberId === 'b')!
    expect(alex.amount).toBeCloseTo(results.totalMonthlyOutgoing * (2 / 3))
    expect(sam.amount).toBeCloseTo(results.totalMonthlyOutgoing * (1 / 3))
  })

  it('produces an amortisation schedule', () => {
    const results = calculateMortgageResults(baseInputs, [], [], noSplit)
    expect(results.amortisationSchedule.length).toBeGreaterThan(0)
  })
```

(Leave every other describe block in the file untouched.)

- [ ] **Step 2: Run the test file to verify it fails**

Run: `npx vitest run lib/calculations/mortgage.test.ts`
Expected: FAIL — TS/runtime error, `calculateMortgageResults` called with 4 args but only accepts
3, and `baseInputs` no longer matches `MortgageInputs` (still has the old fields until Step 3)

- [ ] **Step 3: Update the type**

In `types/mortgage.ts`, remove the `import { SplitMode } from '@/types/household'` line and drop
`splitMemberIds`/`splitMode` from `MortgageInputs`, leaving:

```ts
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
}
```

(Everything else in the file — `RepaymentFrequency`, `ExpenseFrequency`, `BuyerType`,
`PurchaseCosts`, `Expense`, `AmortisationDataPoint`, `MemberSplitAmount`, `SplitSnapshotEntry`,
`MortgageResults`, `ExpenseBreakdownItem` — is unchanged.)

- [ ] **Step 4: Update `calculateMortgageResults`**

In `lib/calculations/mortgage.ts`, add `HouseholdSplitConfig` to the `@/types/household` import
(line 12):

```ts
import { HouseholdMember, HouseholdSplitConfig } from '@/types/household'
```

Change the function signature and the two lines that read the split fields (around line 139 and
183):

```ts
export function calculateMortgageResults(
  inputs: MortgageInputs,
  expenses: Expense[],
  members: HouseholdMember[],
  splitConfig: HouseholdSplitConfig,
): MortgageResults {
```

```ts
  // Split the total across the selected household members (empty if fewer than 2)
  const splitMembers = members.filter((member) => splitConfig.memberIds.includes(member.id))
  let splitBreakdown: MemberSplitAmount[] = []
  if (splitMembers.length >= 2) {
    const ratios = computeSplit(splitMembers, splitConfig.mode)
```

(The rest of the function body is unchanged.)

- [ ] **Step 5: Run the calculation test file to verify it passes**

Run: `npx vitest run lib/calculations/mortgage.test.ts`
Expected: PASS (all tests)

- [ ] **Step 6: Update `lib/storage.ts`**

Remove `splitMemberIds: [], splitMode: 'even',` from the `DEFAULTS` object (around line 35-36),
leaving:

```ts
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
}
```

Remove the now-stale comment above `KEY_MAP` (the one explaining why split fields aren't encoded)
since there's nothing left to explain — replace the two-comment block above `KEY_MAP` with just:

```ts
// Compact key mapping for URL encoding
const KEY_MAP = {
```

In `loadMortgageData`, simplify the merge — remove the `splitMemberIds` backfill line and its
comment, so the return becomes:

```ts
    return {
      inputs: {
        ...DEFAULTS,
        ...parsedInputs,
      },
      expenses: expensesJson ? JSON.parse(expensesJson) : [],
    }
```

In `decodeMortgageData`, simplify the inputs seed (no more `splitMemberIds` array to spread):

```ts
    // Reconstruct inputs from compact format
    const inputs: MortgageInputs = { ...DEFAULTS }
```

Everything else in `storage.ts` (encode/decode of the other fields, the split *snapshot*
handling via `sp`, `generateShareUrl`) is unchanged — the snapshot is unrelated to
`splitMemberIds`/`splitMode` and keeps working as-is.

- [ ] **Step 7: Update `lib/storage.test.ts`**

Remove `splitMemberIds: [], splitMode: 'even',` from `defaultInputs` and
`splitMemberIds: ['a', 'b'], splitMode: 'income',` from `customData.inputs`. Update the two tests
that reference split fields directly:

Replace the round-trip test's name/body to drop "including split settings" (it now just verifies
inputs/expenses round-trip, nothing split-specific left):

```ts
  it('round-trips inputs and expenses through localStorage', () => {
    saveMortgageData(customData)
    expect(loadMortgageData()).toEqual(customData)
  })
```

Remove the entire `'backfills splitMemberIds/splitMode when loading inputs saved before those
fields existed'` test — there's no longer a split field to backfill.

Update the two `encodeMortgageData`/`decodeMortgageData` assertions that expected split fields to
reset to defaults on decode — since those fields no longer exist on `MortgageInputs`, the decoded
inputs now equal `customData.inputs` (or `defaultInputs`) directly:

```ts
  it('round-trips custom inputs and expenses (splitMemberIds/splitMode no longer exist on MortgageInputs)', () => {
    const encoded = encodeMortgageData(customData)
    const decoded = decodeMortgageData(encoded)

    expect(decoded).not.toBeNull()
    expect(decoded!.inputs).toEqual(customData.inputs)
    expect(decoded!.expenses).toHaveLength(2)
    expect(decoded!.expenses[0]).toMatchObject({
      name: 'Council Rates',
      amount: 400,
      frequency: 'quarterly',
    })
    expect(decoded!.splitSnapshot).toBeNull()
  })
```

Remove the `'returns a fresh splitMemberIds array instance on every decode'` test entirely (no
array left to check identity on).

Update `generateShareUrl`'s first test's assertion from
`{ ...customData.inputs, splitMemberIds: [], splitMode: 'even' }` to `customData.inputs`.

- [ ] **Step 8: Run the storage test file to verify it passes**

Run: `npx vitest run lib/storage.test.ts`
Expected: PASS (all remaining tests)

- [ ] **Step 9: Update `useDashboardData`**

In `components/dashboard/useDashboardData.ts`, destructure `splitConfig` alongside `members` and
pass it through:

```ts
  const { members, splitConfig } = useHousehold()
```

```ts
        setMortgageResults(calculateMortgageResults(saved.inputs, saved.expenses, members, splitConfig))
```

In `components/dashboard/useDashboardData.test.ts`, remove `splitMemberIds: [], splitMode:
'even',` from `savedInputs`, and change the split-aware test's saved-inputs override from
`{ ...savedInputs, splitMemberIds: ['a', 'b'] }` to also seed the split config directly:

```ts
  it('computes mortgage results using saved household members for the split', async () => {
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
    localStorage.setItem('finance-tools-mortgage-inputs', JSON.stringify(savedInputs))
    localStorage.setItem('finance-tools-mortgage-expenses', JSON.stringify([]))

    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.mortgageResults?.splitBreakdown).toHaveLength(2))
  })
```

- [ ] **Step 10: Run the dashboard test file to verify it passes**

Run: `npx vitest run components/dashboard/useDashboardData.test.ts`
Expected: PASS (all tests)

- [ ] **Step 11: Commit**

```bash
git add types/mortgage.ts lib/calculations/mortgage.ts lib/calculations/mortgage.test.ts lib/storage.ts lib/storage.test.ts components/dashboard/useDashboardData.ts components/dashboard/useDashboardData.test.ts
git commit -m "Move split config out of MortgageInputs into calculateMortgageResults"
```

---

### Task 6: Remove split UI from `MortgageForm`

**Files:**
- Modify: `components/tools/mortgage/MortgageForm.tsx`
- Modify: `app/tools/mortgage/page.tsx`
- Test: `components/tools/mortgage/MortgageForm.test.tsx`

**Interfaces:**
- Produces: `MortgageForm({ inputs, onChange }: MortgageFormProps)` — the `members` prop is
  removed entirely.

- [ ] **Step 1: Update the test file first**

Replace `components/tools/mortgage/MortgageForm.test.tsx` with:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MortgageForm } from './MortgageForm'
import { MortgageInputs } from '@/types/mortgage'

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
}

describe('MortgageForm', () => {
  it('reflects the current input values', () => {
    render(<MortgageForm inputs={inputs} onChange={() => {}} />)
    expect(screen.getByLabelText('Property Price')).toHaveValue(500000)
    expect(screen.getByLabelText('Your Deposit')).toHaveValue(100000)
    expect(screen.getByLabelText('Interest Rate (% p.a.)')).toHaveValue(6)
    expect(screen.getByLabelText('Repayment Frequency')).toHaveValue('monthly')
    expect(screen.getByLabelText('Buyer Type')).toHaveValue('standard')
  })

  it('calls onChange with a numeric field updated on input', async () => {
    const onChange = vi.fn()
    render(<MortgageForm inputs={inputs} onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Offset Account Balance'), '5')
    expect(onChange).toHaveBeenLastCalledWith({ ...inputs, offsetBalance: 5 })
  })

  it('calls onChange when the buyer type select changes', async () => {
    const onChange = vi.fn()
    render(<MortgageForm inputs={inputs} onChange={onChange} />)
    await userEvent.selectOptions(screen.getByLabelText('Buyer Type'), 'first_home_buyer')
    expect(onChange).toHaveBeenCalledWith({ ...inputs, buyerType: 'first_home_buyer' })
  })

  it('calls onChange when a cost checkbox is toggled', async () => {
    const onChange = vi.fn()
    render(<MortgageForm inputs={inputs} onChange={onChange} />)
    await userEvent.click(screen.getByLabelText(/Legal\/Conveyancing/))
    expect(onChange).toHaveBeenCalledWith({ ...inputs, includeLegalFees: false })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/tools/mortgage/MortgageForm.test.tsx`
Expected: FAIL — `members` prop marked required by the current component's TS types (or, since
vitest transpiles without full type-checking, the component still renders the split section
unexpectedly / errors reading `members.length` on `undefined`)

- [ ] **Step 3: Remove the split section from `MortgageForm`**

In `components/tools/mortgage/MortgageForm.tsx`:

Remove `Button` from the `@/components/ui` import if nothing else in the file uses it — check
first: `Button` is used nowhere else in this file, so drop it from the import list. Remove the
`HouseholdMember` import entirely.

Remove `members: HouseholdMember[]` from `MortgageFormProps`.

Change the function signature from `export function MortgageForm({ inputs, onChange, members }:
MortgageFormProps) {` to `export function MortgageForm({ inputs, onChange }: MortgageFormProps)
{`.

Remove the `toggleSplitMember` function (lines 46-51 in the original).

Remove the entire `{/* Cost split, only relevant with 2+ household members */}` block (the
`{members.length >= 2 && ( ... )}` section, originally lines 139-175).

The resulting file:

```tsx
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

interface MortgageFormProps {
  inputs: MortgageInputs
  onChange: (inputs: MortgageInputs) => void
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

export function MortgageForm({ inputs, onChange }: MortgageFormProps) {
  const handleChange = (
    field: keyof MortgageInputs,
    value: string | number | boolean,
  ) => {
    onChange({
      ...inputs,
      [field]: value,
    })
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
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Stop passing `members` to `MortgageForm` from the page**

In `app/tools/mortgage/page.tsx`, remove `members,` from the `useMortgageCalculator()`
destructure (around line 23) and remove `members={members}` from the `<MortgageForm>` JSX (around
line 65), leaving:

```tsx
              <MortgageForm inputs={inputs} onChange={setInputs} />
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run components/tools/mortgage/MortgageForm.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add components/tools/mortgage/MortgageForm.tsx components/tools/mortgage/MortgageForm.test.tsx app/tools/mortgage/page.tsx
git commit -m "Remove cost-split UI from MortgageForm"
```

---

### Task 7: Wire household split config into `useMortgageCalculator`

**Files:**
- Modify: `components/tools/mortgage/useMortgageCalculator.ts`
- Test: `components/tools/mortgage/useMortgageCalculator.test.ts`
- Test: `app/tools/mortgage/page.test.tsx`

**Interfaces:**
- Consumes: `useHousehold()`'s `members`/`splitConfig` (Task 2);
  `calculateMortgageResults(inputs, expenses, members, splitConfig)` (Task 5)
- Produces: `useMortgageCalculator()` no longer returns `members` (nothing consumes it anymore —
  `MortgageForm` doesn't need it after Task 6, and it's used internally only)

- [ ] **Step 1: Update the hook test file first**

In `components/tools/mortgage/useMortgageCalculator.test.ts`, remove `splitMemberIds: [],
splitMode: 'even',` from `baseInputs`.

Replace the three split-related tests (`'exposes household members and computes a live split
once two are selected'`, `'defaults to selecting every household member...'`, `'does not
override a previously saved split selection'`) with a single test that seeds the split config
directly (the seeding behavior itself is now covered by `useHousehold.test.ts` from Task 2):

```ts
  it('computes a live split from the household split config', async () => {
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

    const { result } = renderHook(() => useMortgageCalculator())

    act(() => {
      result.current.setInputs({
        ...result.current.inputs,
        loanAmount: 500000,
        deposit: 100000,
        interestRate: 6,
      })
    })

    await waitFor(() => expect(result.current.displaySplitBreakdown).toHaveLength(2))
    expect(result.current.displaySplitBreakdown[0].amount).toBeCloseTo(
      result.current.displaySplitBreakdown[1].amount,
    )
  })
```

- [ ] **Step 2: Run the hook test file to verify it fails**

Run: `npx vitest run components/tools/mortgage/useMortgageCalculator.test.ts`
Expected: FAIL — `baseInputs` no longer matches `MortgageInputs`'s shape, `displaySplitBreakdown`
stays empty since the hook doesn't read household split config yet

- [ ] **Step 3: Update `useMortgageCalculator`**

Replace `components/tools/mortgage/useMortgageCalculator.ts` with:

```ts
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
}

export function useMortgageCalculator() {
  const searchParams = useSearchParams()
  const { members, splitConfig } = useHousehold()
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
      return calculateMortgageResults(adjustedInputs, expenses, members, splitConfig)
    }
    return null
  }, [inputs, expenses, purchaseCosts, members, splitConfig])

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

- [ ] **Step 4: Run the hook test file to verify it passes**

Run: `npx vitest run components/tools/mortgage/useMortgageCalculator.test.ts`
Expected: PASS (all tests)

- [ ] **Step 5: Update the mortgage page test's split-related test**

In `app/tools/mortgage/page.test.tsx`, replace the `'defaults to splitting between all household
members once entered'` test (the split UI it clicked through no longer lives on this page) with:

```tsx
  it('shows the household split once the household has 2+ members', async () => {
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

    // Household split config seeds to "everyone" the first time there are 2+ members and
    // nothing's been configured — the mortgage page just displays the resulting breakdown.
    expect(await screen.findByText('Split')).toBeInTheDocument()
    expect(screen.getAllByText('Alex').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Sam').length).toBeGreaterThanOrEqual(1)
  })
```

- [ ] **Step 6: Run the full mortgage page test file to verify it passes**

Run: `npx vitest run app/tools/mortgage/page.test.tsx`
Expected: PASS (all tests)

- [ ] **Step 7: Commit**

```bash
git add components/tools/mortgage/useMortgageCalculator.ts components/tools/mortgage/useMortgageCalculator.test.ts app/tools/mortgage/page.test.tsx
git commit -m "Source mortgage cost split from household-level config"
```

---

### Task 8: Member list layout polish

**Files:**
- Modify: `components/household/MemberItem.tsx`

**Interfaces:**
- No prop/behavior changes — `MemberItemProps` and all callback signatures stay identical.
  `MemberItem.test.tsx` and `MemberList.test.tsx` assert on labels/roles, not layout, so they
  need no changes; they double as the regression check for this task.

- [ ] **Step 1: Run the existing tests to confirm today's baseline passes**

Run: `npx vitest run components/household/MemberItem.test.tsx components/household/MemberList.test.tsx`
Expected: PASS (baseline, before the layout change)

- [ ] **Step 2: Tighten the row layout**

Replace `components/household/MemberItem.tsx` with:

```tsx
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
        grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-3 items-end
        p-3 bg-background rounded-lg border border-border
      `}
    >
      <Input
        id={`member-name-${member.id}`}
        label="Name"
        type="text"
        placeholder="e.g., Rafael"
        value={member.name}
        onChange={(e) => handleChange('name', e.target.value)}
      />
      <Input
        id={`member-income-${member.id}`}
        label="Annual Income"
        type="number"
        prefix="$"
        placeholder="95000"
        value={member.income || ''}
        onChange={(e) => handleChange('income', parseFloat(e.target.value) || 0)}
      />
      <Button
        variant="ghost"
        size="md"
        onClick={onRemove}
        className="text-red-400 hover:text-red-300 hover:bg-red-400/10 justify-self-start sm:justify-self-auto"
        aria-label="Remove member"
      >
        <TrashIcon width="20" height="20" />
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: Run the tests to verify they still pass**

Run: `npx vitest run components/household/MemberItem.test.tsx components/household/MemberList.test.tsx`
Expected: PASS (unchanged — this task is layout-only)

- [ ] **Step 4: Commit**

```bash
git add components/household/MemberItem.tsx
git commit -m "Tighten household member list row layout"
```

---

### Task 9: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: All test files pass, no failures

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No errors (warnings pre-existing to the codebase, e.g. the documented
`react-hooks/set-state-in-effect` note in `useDashboardData.ts`, are fine — no *new* warnings from
this plan's changes)

- [ ] **Step 3: Run Prettier check**

Run: `npx prettier --check .`
Expected: No files need formatting; if any do, run `npm run format` and re-check

- [ ] **Step 4: Run the production build**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors

- [ ] **Step 5: Manual smoke check in the dev server**

Run: `npm run dev`, then in a browser:
- Visit `/profile`, add 2 members, confirm "Cost Splitting" card appears with both members
  checked by default and the even/income toggle works
- Visit `/tools/mortgage`, enter loan details, confirm the "Split" section in Results Summary
  reflects the household config with no split controls on this page anymore
- Visit `/` (dashboard) and confirm the mortgage snapshot card still reflects saved data

- [ ] **Step 6: Commit (only if Steps 1-4 required any fixes not already committed)**

```bash
git add -A
git commit -m "Fix issues found in full verification pass"
```
