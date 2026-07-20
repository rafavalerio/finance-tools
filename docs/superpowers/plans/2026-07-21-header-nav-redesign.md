# Header & Navigation Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mobile "3 dots" tool picker with a hamburger + sliding left drawer (used at
every screen size), make the profile button a distinct round accent-filled icon, and collapse
each tool page's header down to just a title + a single, app-like settings dropdown — eliminating
the mortgage page's double-header.

**Architecture:** Extend the shared `Button` primitive with a `shape="circle"` option so both the
profile button and the redesigned actions-dropdown trigger can be round without fighting Tailwind
class-override ordering. Build one new component (`NavDrawer`) for the sliding tool-picker, one
new reusable component (`ToolHeader`) that any tool page composes for its title/actions bar, and
restyle two existing components (`ProfileMenu`, `HeaderActions`) in place. `TopNav` is rewired to
compose hamburger + brand + `NavDrawer` + `ProfileMenu`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS v4, lucide-react,
Vitest + React Testing Library (jsdom).

## Global Constraints

- Prettier: single quotes, no semicolons, trailing commas everywhere, printWidth 100, tabWidth 2
  — run `npm run format` before every commit.
- Tests live next to the code they cover as `*.test.ts(x)`; every new/changed component file gets
  a test in the same task.
- Reuse `components/ui/` primitives (`Button`, etc.) instead of raw `<button>`/inline SVGs.
- New lucide icons are added to `components/ui/icons.tsx` (semantic re-export) and its barrel
  `components/ui/index.ts` — never import `lucide-react` directly in a page/component.
- `components/ui/*` barrel-exports via `components/ui/index.ts`; `components/layout/*` that's
  meant to be reused elsewhere barrel-exports via `components/layout/index.ts` (internal-only
  components like `ProfileMenu`/`NavDrawer` are not barrel-exported, matching existing
  convention).
- Delete code that becomes fully unused (e.g. an icon export with no remaining call site) rather
  than leaving it as dead weight.

---

### Task 1: `Button` gains a `shape="circle"` option

**Files:**
- Modify: `components/ui/Button.tsx`
- Test: `components/ui/Button.test.tsx`

**Interfaces:**
- Produces: `Button` accepts a new optional prop `shape?: 'default' | 'circle'` (defaults to
  `'default'`, which renders exactly as before — `rounded-lg` + the existing `sizes` padding
  map). `shape="circle"` renders `rounded-full` with square padding from a new `circleSizes` map
  (`sm: 'p-2 text-sm'`, `md: 'p-2.5 text-base'`, `lg: 'p-3 text-lg'`), so an icon-only child forms
  a true circle instead of a rounded rectangle.

- [ ] **Step 1: Write the failing test**

Add to `components/ui/Button.test.tsx`, after the existing `'merges a custom className...'` test:

```tsx
it('renders as a circle when shape="circle" is set', () => {
  render(
    <Button shape="circle" size="sm">
      X
    </Button>,
  )
  const button = screen.getByRole('button')
  expect(button.className).toMatch(/rounded-full/)
  expect(button.className).not.toMatch(/rounded-lg/)
  expect(button.className).toMatch(/\bp-2\b/)
})

it('defaults to shape="default" (rounded-lg, asymmetric padding)', () => {
  render(<Button size="sm">X</Button>)
  const button = screen.getByRole('button')
  expect(button.className).toMatch(/rounded-lg/)
  expect(button.className).toMatch(/px-3/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- Button.test.tsx`
Expected: FAIL — `shape` prop doesn't exist yet, so both tests currently assert on `rounded-lg`
either way; the first new test fails because `rounded-full` is never applied.

- [ ] **Step 3: Implement `shape` support**

Replace the full contents of `components/ui/Button.tsx`:

```tsx
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  shape?: 'default' | 'circle'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className = '', variant = 'primary', size = 'md', shape = 'default', children, ...props },
    ref,
  ) => {
    const baseStyles = `
      inline-flex items-center justify-center font-medium transition-colors
      focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background
      disabled:opacity-50 disabled:cursor-not-allowed
      ${shape === 'circle' ? 'rounded-full' : 'rounded-lg'}
    `

    const variants = {
      primary:
        'bg-accent text-background hover:bg-accent/90 hover:shadow-md hover:shadow-accent/20',
      secondary:
        'bg-card text-foreground border border-border hover:bg-border hover:border-accent/50',
      ghost: 'text-foreground border border-transparent hover:bg-card hover:border-border',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    }

    const circleSizes = {
      sm: 'p-2 text-sm',
      md: 'p-2.5 text-base',
      lg: 'p-3 text-lg',
    }

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${
          shape === 'circle' ? circleSizes[size] : sizes[size]
        } ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'

export { Button }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- Button.test.tsx`
Expected: PASS (all tests including the two new ones)

- [ ] **Step 5: Format, then commit**

```bash
npm run format
git add components/ui/Button.tsx components/ui/Button.test.tsx
git commit -m "Add circle shape option to Button primitive"
```

---

### Task 2: Redesign `HeaderActions` as a single gear-triggered dropdown

**Files:**
- Modify: `components/ui/icons.tsx`
- Modify: `components/ui/index.ts`
- Modify: `components/ui/HeaderActions.tsx`
- Test: `components/ui/HeaderActions.test.tsx`

**Interfaces:**
- Consumes: `Button` with `shape="circle"` (Task 1).
- Produces: `HeaderActions({ actions: HeaderAction[] })` — unchanged public prop shape from
  before, but now renders exactly one trigger button (`aria-label="More actions"`) at every
  screen size, no inline button row. Callers relying on `screen.getByRole('button', { name:
  /share/i })` directly (bypassing the menu) will break — this is expected and fixed in Task 4.

- [ ] **Step 1: Add `SettingsIcon` to the icon barrel**

In `components/ui/icons.tsx`, add `Settings as SettingsIcon,` to the export list (keep every
existing line, including `MoreVertical as MoreIcon` and `ArrowLeft as ArrowLeftIcon` — those are
removed in later tasks once their last consumers are migrated):

```tsx
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
  Settings as SettingsIcon,
} from 'lucide-react'
```

In `components/ui/index.ts`, add `SettingsIcon,` to the icon export list (keep everything else
as-is):

```ts
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
  SettingsIcon,
} from './icons'
```

- [ ] **Step 2: Write the failing test**

Replace the full contents of `components/ui/HeaderActions.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HeaderActions } from './HeaderActions'

const buildActions = (onShare = vi.fn(), onReset = vi.fn()) => [
  { key: 'share', label: 'Share', icon: <span>share-icon</span>, onClick: onShare },
  {
    key: 'reset',
    label: 'Reset',
    icon: <span>reset-icon</span>,
    onClick: onReset,
    variant: 'danger' as const,
  },
]

describe('HeaderActions', () => {
  it('renders a single round trigger and no inline action buttons', () => {
    render(<HeaderActions actions={buildActions()} />)
    expect(screen.getByRole('button', { name: 'More actions' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^share$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^reset$/i })).not.toBeInTheDocument()
  })

  it('does not show the menu until the trigger is clicked', () => {
    render(<HeaderActions actions={buildActions()} />)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('opens the menu and fires the action when a menu item is clicked', async () => {
    const onShare = vi.fn()
    render(<HeaderActions actions={buildActions(onShare)} />)

    await userEvent.click(screen.getByRole('button', { name: 'More actions' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('menuitem', { name: /share/i }))
    expect(onShare).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes the menu on Escape', async () => {
    render(<HeaderActions actions={buildActions()} />)

    await userEvent.click(screen.getByRole('button', { name: 'More actions' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes the menu when clicking outside', async () => {
    render(
      <div>
        <button>outside</button>
        <HeaderActions actions={buildActions()} />
      </div>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'More actions' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'outside' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('renders the trigger as a distinct circle button', () => {
    render(<HeaderActions actions={buildActions()} />)
    const trigger = screen.getByRole('button', { name: 'More actions' })
    expect(trigger.className).toMatch(/rounded-full/)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- HeaderActions.test.tsx`
Expected: FAIL — current component still renders an inline `sm:flex` button row, so "no inline
action buttons" and "distinct circle button" assertions fail.

- [ ] **Step 4: Implement the redesign**

Replace the full contents of `components/ui/HeaderActions.tsx`:

```tsx
'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import { Button } from './Button'
import { SettingsIcon } from './icons'

export interface HeaderAction {
  key: string
  label: string
  icon: ReactNode
  onClick: () => void
  /** 'danger' mutes the control until hovered/focused, then tints it red (e.g. "Reset"). */
  variant?: 'default' | 'danger'
}

interface HeaderActionsProps {
  actions: HeaderAction[]
}

export function HeaderActions({ actions }: HeaderActionsProps) {
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

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <Button
        variant="secondary"
        size="sm"
        shape="circle"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <SettingsIcon width="18" height="18" />
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-10 mt-2 w-44 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
        >
          {actions.map((action) => (
            <button
              key={action.key}
              role="menuitem"
              onClick={() => {
                action.onClick()
                setOpen(false)
              }}
              className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-border ${
                action.variant === 'danger' ? 'text-muted hover:text-red-400' : 'text-foreground'
              }`}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- HeaderActions.test.tsx`
Expected: PASS

- [ ] **Step 6: Format, then commit**

```bash
npm run format
git add components/ui/icons.tsx components/ui/index.ts components/ui/HeaderActions.tsx components/ui/HeaderActions.test.tsx
git commit -m "Redesign HeaderActions as a single gear-triggered dropdown"
```

---

### Task 3: New reusable `ToolHeader` component

**Files:**
- Create: `components/layout/ToolHeader.tsx`
- Test: `components/layout/ToolHeader.test.tsx`
- Modify: `components/layout/index.ts`

**Interfaces:**
- Consumes: `HeaderActions` + `HeaderAction` type from `@/components/ui` (Task 2), `PageContainer`
  from `./PageContainer`.
- Produces: `ToolHeader({ title: string, actions: HeaderAction[] })` — renders a `<header>` with
  just an `<h1>` and the actions dropdown, no back link, no subtitle. Barrel-exported from
  `components/layout/index.ts` for reuse by any tool page.

- [ ] **Step 1: Write the failing test**

Create `components/layout/ToolHeader.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ToolHeader } from './ToolHeader'

describe('ToolHeader', () => {
  it('renders the title as a heading', () => {
    render(<ToolHeader title="Mortgage Calculator" actions={[]} />)
    expect(screen.getByRole('heading', { name: 'Mortgage Calculator' })).toBeInTheDocument()
  })

  it('renders the actions trigger and no back link', () => {
    render(
      <ToolHeader
        title="Mortgage Calculator"
        actions={[
          { key: 'share', label: 'Share', icon: <span>share-icon</span>, onClick: vi.fn() },
        ]}
      />,
    )
    expect(screen.getByRole('button', { name: 'More actions' })).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- ToolHeader.test.tsx`
Expected: FAIL with "Cannot find module './ToolHeader'"

- [ ] **Step 3: Implement `ToolHeader`**

Create `components/layout/ToolHeader.tsx`:

```tsx
import { HeaderActions, type HeaderAction } from '@/components/ui'
import { PageContainer } from './PageContainer'

interface ToolHeaderProps {
  title: string
  actions: HeaderAction[]
}

export function ToolHeader({ title, actions }: ToolHeaderProps) {
  return (
    <header className="border-b border-border">
      <PageContainer className="py-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h1>
          <HeaderActions actions={actions} />
        </div>
      </PageContainer>
    </header>
  )
}
```

Add to `components/layout/index.ts`:

```ts
export { TopNav } from './TopNav'
export { PageContainer } from './PageContainer'
export { ToolHeader } from './ToolHeader'
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- ToolHeader.test.tsx`
Expected: PASS

- [ ] **Step 5: Format, then commit**

```bash
npm run format
git add components/layout/ToolHeader.tsx components/layout/ToolHeader.test.tsx components/layout/index.ts
git commit -m "Add reusable ToolHeader component"
```

---

### Task 4: Mortgage page adopts `ToolHeader`, drops back arrow/subtitle

**Files:**
- Modify: `app/tools/mortgage/page.tsx`
- Modify: `components/ui/icons.tsx`
- Modify: `components/ui/index.ts`
- Modify: `app/tools/mortgage/page.test.tsx`

**Interfaces:**
- Consumes: `ToolHeader` from `@/components/layout` (Task 3).

- [ ] **Step 1: Update the failing assertions in `page.test.tsx`**

In `app/tools/mortgage/page.test.tsx`, the "clears the form when Reset is confirmed" and "opens
the share modal" tests currently click a visible `Reset`/`Share` button directly — that button no
longer exists standalone, it's behind the "More actions" trigger (Task 2). Replace those two
tests:

```tsx
it('clears the form when Reset is confirmed', async () => {
  render(<MortgageCalculatorPage />)

  await userEvent.type(screen.getByLabelText('Property Price'), '500000')
  expect(screen.getByLabelText('Property Price')).toHaveValue(500000)

  await userEvent.click(screen.getByRole('button', { name: 'More actions' }))
  await userEvent.click(screen.getByRole('menuitem', { name: /reset/i }))

  expect(screen.getByLabelText('Property Price')).toHaveValue(null)
})

it('opens the share modal with a generated link', async () => {
  render(<MortgageCalculatorPage />)

  await userEvent.click(screen.getByRole('button', { name: 'More actions' }))
  await userEvent.click(screen.getByRole('menuitem', { name: /share/i }))

  expect(screen.getByText('Share Calculator')).toBeInTheDocument()
  expect(screen.getByDisplayValue(/\/tools\/mortgage\?data=/)).toBeInTheDocument()
})
```

Leave the other two tests (`'shows calculated results...'`, `'defaults to splitting...'`)
unchanged — they don't touch Reset/Share.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- app/tools/mortgage/page.test.tsx`
Expected: FAIL — the page still renders the old header with visible Reset/Share buttons plus a
back arrow and subtitle, so `getByRole('button', { name: 'More actions' })` doesn't exist yet.

- [ ] **Step 3: Update the mortgage page to use `ToolHeader`**

In `app/tools/mortgage/page.tsx`, change the imports:

```tsx
import { ShareIcon, ResetIcon } from '@/components/ui'
import { PageContainer, ToolHeader } from '@/components/layout'
```

(drops `HeaderActions` and `ArrowLeftIcon` from the `@/components/ui` import — `ToolHeader` now
owns rendering `HeaderActions` internally)

Replace the `{/* Header */}` block:

```tsx
{/* Header */}
<ToolHeader
  title="Mortgage Calculator"
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
```

- [ ] **Step 4: Remove the now-unused `ArrowLeftIcon`**

`ArrowLeftIcon`'s only call site was the header block just removed. Remove `ArrowLeft as
ArrowLeftIcon,` from `components/ui/icons.tsx` and `ArrowLeftIcon,` from `components/ui/index.ts`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- app/tools/mortgage/page.test.tsx`
Expected: PASS

Run: `npm run test`
Expected: PASS (full suite — confirms nothing else referenced `ArrowLeftIcon` or the old header
shape)

- [ ] **Step 6: Format, then commit**

```bash
npm run format
git add app/tools/mortgage/page.tsx app/tools/mortgage/page.test.tsx components/ui/icons.tsx components/ui/index.ts
git commit -m "Adopt ToolHeader on the mortgage page, drop back arrow and subtitle"
```

---

### Task 5: `ProfileMenu` trigger becomes a round, accent-filled circle

**Files:**
- Modify: `components/layout/ProfileMenu.tsx`
- Test: `components/layout/ProfileMenu.test.tsx`

**Interfaces:**
- Consumes: `Button` with `shape="circle"` (Task 1).

- [ ] **Step 1: Write the failing test**

Add to `components/layout/ProfileMenu.test.tsx`, inside the `describe` block:

```tsx
it('renders the trigger as an accent-filled circle', () => {
  render(<ProfileMenu />)
  const trigger = screen.getByRole('button', { name: 'Open profile menu' })
  expect(trigger.className).toMatch(/rounded-full/)
  expect(trigger.className).toMatch(/bg-accent/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- ProfileMenu.test.tsx`
Expected: FAIL — trigger currently uses `variant="secondary"` (no `shape`, so `rounded-lg`/no
`bg-accent`).

- [ ] **Step 3: Restyle the trigger**

In `components/layout/ProfileMenu.tsx`, change the trigger `Button`:

```tsx
<Button
  variant="primary"
  size="sm"
  shape="circle"
  onClick={() => setOpen((isOpen) => !isOpen)}
  aria-label="Open profile menu"
  aria-haspopup="menu"
  aria-expanded={open}
>
  <UserIcon width="20" height="20" />
</Button>
```

(`variant="primary"` already renders `bg-accent text-background`, giving an accent-filled circle
with the user icon in the background color — no extra classes needed.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- ProfileMenu.test.tsx`
Expected: PASS

- [ ] **Step 5: Format, then commit**

```bash
npm run format
git add components/layout/ProfileMenu.tsx components/layout/ProfileMenu.test.tsx
git commit -m "Restyle ProfileMenu trigger as an accent-filled circle"
```

---

### Task 6: New `NavDrawer` component

**Files:**
- Create: `components/layout/NavDrawer.tsx`
- Test: `components/layout/NavDrawer.test.tsx`

**Interfaces:**
- Consumes: `CloseIcon` from `@/components/ui` (existing export).
- Produces: `NavDrawer({ isOpen: boolean, onClose: () => void })` — a left-sliding overlay
  listing Dashboard/Mortgage/Budget links. Not barrel-exported (internal to `TopNav`, wired up in
  Task 7).

- [ ] **Step 1: Write the failing test**

Create `components/layout/NavDrawer.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NavDrawer } from './NavDrawer'

const mockUsePathname = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

beforeEach(() => {
  mockUsePathname.mockReturnValue('/')
})

describe('NavDrawer', () => {
  it('renders nothing when closed', () => {
    render(<NavDrawer isOpen={false} onClose={vi.fn()} />)
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument()
  })

  it('renders Dashboard, Mortgage links and a disabled Budget entry when open', () => {
    render(<NavDrawer isOpen onClose={vi.fn()} />)
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Mortgage' })).toHaveAttribute(
      'href',
      '/tools/mortgage',
    )
    expect(screen.queryByRole('link', { name: /budget/i })).not.toBeInTheDocument()
    expect(screen.getByText(/budget/i)).toBeInTheDocument()
  })

  it('calls onClose when a link is clicked', async () => {
    const onClose = vi.fn()
    render(<NavDrawer isOpen onClose={onClose} />)
    await userEvent.click(screen.getByRole('link', { name: 'Mortgage' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the backdrop is clicked', async () => {
    const onClose = vi.fn()
    const { container } = render(<NavDrawer isOpen onClose={onClose} />)
    const backdrop = container.querySelector('.fixed.inset-0 > div.absolute') as HTMLElement
    await userEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn()
    render(<NavDrawer isOpen onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Close navigation menu' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose on Escape', async () => {
    const onClose = vi.fn()
    render(<NavDrawer isOpen onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- NavDrawer.test.tsx`
Expected: FAIL with "Cannot find module './NavDrawer'"

- [ ] **Step 3: Implement `NavDrawer`**

Create `components/layout/NavDrawer.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CloseIcon } from '@/components/ui'

interface NavLink {
  key: string
  label: string
  href: string
  disabled?: boolean
}

const NAV_LINKS: NavLink[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/' },
  { key: 'mortgage', label: 'Mortgage', href: '/tools/mortgage' },
  { key: 'budget', label: 'Budget', href: '#', disabled: true },
]

interface NavDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function NavDrawer({ isOpen, onClose }: NavDrawerProps) {
  const pathname = usePathname()

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const linkClassName = (link: NavLink) => {
    if (link.disabled) return 'text-muted/50 cursor-not-allowed'
    return pathname === link.href
      ? 'text-accent'
      : 'text-foreground hover:text-accent transition-colors'
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative h-full w-64 max-w-[80vw] bg-card border-r border-border shadow-2xl animate-in slide-in-from-left duration-200">
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <span className="font-bold text-foreground">Finance Tools</span>
          <button
            onClick={onClose}
            aria-label="Close navigation menu"
            className="text-muted hover:text-foreground transition-colors"
          >
            <CloseIcon width="20" height="20" />
          </button>
        </div>

        <nav className="py-2">
          {NAV_LINKS.map((link) =>
            link.disabled ? (
              <span
                key={link.key}
                className={`block px-4 py-3 text-sm font-medium ${linkClassName(link)}`}
              >
                {link.label} (soon)
              </span>
            ) : (
              <Link
                key={link.key}
                href={link.href}
                onClick={onClose}
                className={`block px-4 py-3 text-sm font-medium ${linkClassName(link)}`}
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- NavDrawer.test.tsx`
Expected: PASS

- [ ] **Step 5: Format, then commit**

```bash
npm run format
git add components/layout/NavDrawer.tsx components/layout/NavDrawer.test.tsx
git commit -m "Add NavDrawer sliding tool-picker component"
```

---

### Task 7: `TopNav` rewired to hamburger + `NavDrawer` + `ProfileMenu`

**Files:**
- Modify: `components/layout/TopNav.tsx`
- Modify: `components/ui/icons.tsx`
- Modify: `components/ui/index.ts`
- Modify: `components/layout/TopNav.test.tsx`

**Interfaces:**
- Consumes: `NavDrawer` (Task 6), `ProfileMenu` (Task 5), `Button` with `shape="circle"` (Task 1).

- [ ] **Step 1: Add `MenuIcon`, remove now-unused `MoreIcon`**

In `components/ui/icons.tsx`, replace `MoreVertical as MoreIcon,` with `Menu as MenuIcon,` (this
is the last remaining consumer of `MoreIcon` — `HeaderActions` switched to `SettingsIcon` in Task
2):

```tsx
export {
  Wallet as WalletIcon,
  Home as HouseIcon,
  PlusCircle as PlusCircleIcon,
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
  User as UserIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
} from 'lucide-react'
```

This is the same file from Task 4 (which already dropped `ArrowLeft as ArrowLeftIcon,`) with
`MoreVertical as MoreIcon,` now replaced by `Menu as MenuIcon,`.

In `components/ui/index.ts`, replace `MoreIcon,` with `MenuIcon,` in the icon export list.

- [ ] **Step 2: Update the failing assertions in `TopNav.test.tsx`**

Replace the full contents of `components/layout/TopNav.test.tsx`:

```tsx
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
  it('renders the brand link to the dashboard', () => {
    render(<TopNav />)
    expect(screen.getByRole('link', { name: /finance tools/i })).toHaveAttribute('href', '/')
  })

  it('renders the profile menu button, always visible', () => {
    render(<TopNav />)
    expect(screen.getByRole('button', { name: 'Open profile menu' })).toBeInTheDocument()
  })

  it('opens the nav drawer from the hamburger button and closes it on Escape', async () => {
    render(<TopNav />)

    expect(screen.queryByRole('link', { name: 'Mortgage' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }))
    expect(screen.getByRole('link', { name: 'Mortgage' })).toHaveAttribute(
      'href',
      '/tools/mortgage',
    )

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('link', { name: 'Mortgage' })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test -- TopNav.test.tsx`
Expected: FAIL — current `TopNav` has no "Open navigation menu" button with drawer behavior tied
to a `NavDrawer`, and still renders the old inline links/collapsed dots menu.

- [ ] **Step 4: Rewire `TopNav`**

Replace the full contents of `components/layout/TopNav.tsx`:

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button, WalletIcon, MenuIcon } from '@/components/ui'
import { PageContainer } from './PageContainer'
import { ProfileMenu } from './ProfileMenu'
import { NavDrawer } from './NavDrawer'

export function TopNav() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <nav className="border-b border-border">
      <PageContainer className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            shape="circle"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={drawerOpen}
          >
            <MenuIcon width="20" height="20" />
          </Button>

          <Link href="/" className="flex shrink-0 items-center gap-2 font-bold text-foreground">
            <WalletIcon width="20" height="20" className="text-accent" />
            Finance Tools
          </Link>
        </div>

        <ProfileMenu />
      </PageContainer>

      <NavDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </nav>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- TopNav.test.tsx`
Expected: PASS

Run: `npm run test`
Expected: PASS (full suite)

- [ ] **Step 6: Format, then commit**

```bash
npm run format
git add components/layout/TopNav.tsx components/layout/TopNav.test.tsx components/ui/icons.tsx components/ui/index.ts
git commit -m "Rewire TopNav to hamburger + NavDrawer, remove inline links and dots menu"
```

---

### Task 8: Full verification pass

**Files:** none (verification only; fix anything the checks surface)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: PASS, all files

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No errors. (The pre-existing `react-hooks/set-state-in-effect` warning on
`useMortgageCalculator.ts`, noted in `CLAUDE.md` as a known gap, is unrelated to this work and
may still appear — don't attempt to fix it here.)

- [ ] **Step 3: Run a production build**

Run: `npm run build`
Expected: Build succeeds with no type errors.

- [ ] **Step 4: Manual smoke check in the dev server**

Run: `npm run dev`, then in a browser:
- Confirm the hamburger opens the left drawer with Dashboard/Mortgage/Budget (soon), active route
  highlighted, closes on backdrop/Escape/link-click.
- Confirm the profile button is a round, accent-filled circle in the top right.
- Navigate to `/tools/mortgage` — confirm only one header renders (title + round settings-gear
  button), no back arrow, no subtitle; the gear button opens Share/Reset.
- Stop the dev server (Ctrl+C) once confirmed.

- [ ] **Step 5: Fix any issues found, then commit if changes were needed**

If Steps 1–4 surfaced any issue, fix it, re-run the relevant check, then:

```bash
npm run format
git add -A
git commit -m "Fix issues found in full verification pass"
```

If nothing needed fixing, no commit is required for this task.
