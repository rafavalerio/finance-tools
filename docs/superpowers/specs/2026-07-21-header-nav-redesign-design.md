# Header & Navigation Redesign — Design

## Context & goal

Two things look off in the current header:

1. The mobile-only "3 dots" menu in `TopNav` for picking a tool is an odd, under-discoverable
   pattern, and the profile button next to it is a plain square `secondary` button — it doesn't
   read as a distinct account/settings affordance.
2. The mortgage tool page renders its own `<header>` below the global `TopNav` — back arrow,
   title, subtitle, and a "more" dropdown — producing a visible double-header (see screenshot).

This round: replace the tool-picker with a hamburger icon that opens a sliding left drawer (used
at every screen size, not just mobile), make the profile button a distinct round icon, and
collapse each tool page's header down to just a title + a single, more app-like settings dropdown
— no back arrow, no subtitle. The tool-header piece becomes a reusable `ToolHeader` component so
future tools (e.g. Budget) don't hand-roll their own header.

## Out of scope

- `ProfileMenu`'s dropdown content (household summary / CTA) — unchanged, only its trigger
  button's shape/styling changes.
- Any change to `PageContainer`, page widths, or the household/dashboard data model.
- The Budget tool itself (still a placeholder) — it's covered by these changes only in that it
  gains an entry in the new nav drawer and, whenever it's built out, can reuse `ToolHeader`.

## 1. `TopNav` — hamburger + drawer replaces inline links and the "3 dots" menu

`components/layout/TopNav.tsx` is restructured left-to-right:

- **Hamburger button** (new `MenuIcon`, lucide's `Menu`) — far left. Opens the new `NavDrawer`.
- **Brand** (`WalletIcon` + "Finance Tools", still `<Link href="/">`) — immediately after the
  hamburger.
- **Profile button** (`ProfileMenu`) — far right, at every screen size.

Removed entirely: the `sm:flex` inline `NAV_LINKS` list and the `sm:hidden` collapsed "3 dots"
dropdown (with its own click-outside/Escape handling). `TopNav` now owns one piece of state,
`drawerOpen`, instead of the old `open` state for the collapsed menu.

`NAV_LINKS` (currently `{ key: 'mortgage', ... }`, `{ key: 'budget', ... }`) moves into
`NavDrawer.tsx` with a `Dashboard` entry prepended — it's no longer specific to a "collapsed nav"
concept, it's the drawer's link list.

## 2. `NavDrawer` (new, `components/layout/NavDrawer.tsx`)

Props: `isOpen: boolean`, `onClose: () => void`. Not barrel-exported — internal to `TopNav`, same
as `ProfileMenu` today.

- Backdrop: `fixed inset-0 bg-black/60 backdrop-blur-sm`, click closes the drawer. Same idiom as
  `Modal.tsx`.
- Panel: fixed to the left edge, full height, slides in via a transform/transition (`translate-x`
  with a `duration-200`-class transition, consistent with `Modal`'s `animate-in` usage), width
  similar to today's collapsed-menu dropdown (`w-64`-ish, wider than `w-44` since it's a full
  panel, not an inline dropdown).
- Content: a link list — **Dashboard** (`href: '/'`), **Mortgage** (`href: '/tools/mortgage'`),
  **Budget** (disabled, "soon"). Active route highlighted in `text-accent`, same logic as today's
  `linkClassName` in `TopNav`. Each link closes the drawer on click.
- Closes on: backdrop click, Escape key, link click — same pattern as `ProfileMenu`'s existing
  `useEffect` click-outside/Escape handling (mousedown listener + keydown listener, cleaned up on
  unmount/close).
- Body scroll lock while open (`document.body.style.overflow = 'hidden'`), matching `Modal.tsx`.

## 3. `ProfileMenu` — round, accent-filled trigger

`components/layout/ProfileMenu.tsx`: the trigger `Button` changes from `variant="secondary"`
(square, bordered) to a circular accent-filled button — `rounded-full bg-accent`, `UserIcon` in
`text-background` (dark icon on the orange accent) instead of the current `text-foreground`-ish
default. Same size (`sm`), same `aria-label`/`aria-haspopup`/`aria-expanded`. Dropdown
content/behavior (empty-state CTA vs. member summary + "Manage household →") is unchanged.

## 4. `HeaderActions` — one gear-triggered dropdown, always

`components/ui/HeaderActions.tsx` currently renders two variants: inline buttons at `sm:` and up,
a collapsed dropdown below `sm:`. Since this becomes the shared "tool actions" pattern used by
`ToolHeader`, it collapses to **a single always-dropdown trigger** at every screen size:

- Trigger: a distinct round/pill button (`rounded-full`, e.g. `border border-border` or
  `bg-card` with a hover accent ring — visually heavier than a plain `secondary` square button) —
  containing a new `SettingsIcon` (lucide's `Settings`, gear) instead of `MoreIcon`.
- Dropdown menu: unchanged structure/content (`role="menu"`, `role="menuitem"` buttons, icon +
  label, `danger` variant mutes-until-hover-then-reds, same click-outside/Escape idiom).
- The `actions` prop shape (`HeaderAction[]`) is unchanged, so callers don't need to change how
  they build the action list — only how the trigger renders.

`MoreIcon` becomes unused (its only two call sites — `TopNav`'s old collapsed menu and
`HeaderActions`' old collapsed trigger — are both gone) and is removed from
`components/ui/icons.tsx` and its barrel export. `SettingsIcon` (`Settings`) and `MenuIcon`
(`Menu`) are added the same way.

## 5. New reusable `ToolHeader` (`components/layout/ToolHeader.tsx`)

Props: `title: string`, `actions: HeaderAction[]`.

```tsx
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

No back arrow, no subtitle — just title + actions. Barrel-exported from
`components/layout/index.ts` alongside `TopNav` and `PageContainer`, since it's meant to be reused
by any tool page, not just mortgage.

`app/tools/mortgage/page.tsx` replaces its inline `<header>` block (the `Link`/`ArrowLeftIcon`,
the `<h1>`/subtitle `<p>`, and the `HeaderActions` call) with:

```tsx
<ToolHeader
  title="Mortgage Calculator"
  actions={[
    { key: 'share', label: 'Share', icon: <ShareIcon .../>, onClick: handleShare },
    { key: 'reset', label: 'Reset', icon: <ResetIcon .../>, onClick: handleReset, variant: 'danger' },
  ]}
/>
```

`ArrowLeftIcon`'s only call site today is this header block, so it becomes fully unused and is
removed from `components/ui/icons.tsx` and its barrel export along with the import in the page
file.

## Testing

Per this repo's convention, every new/changed file gets a test in the same pass:

- `components/layout/NavDrawer.tsx` (new) — renders Dashboard/Mortgage/Budget links, active-route
  highlighting, disabled "Budget (soon)" state, closes on backdrop click / Escape / link click,
  body scroll lock while open.
- `components/layout/TopNav.tsx` — update existing tests: hamburger button opens the drawer
  (replacing old "collapsed menu" tests), brand link still present, profile button still renders
  at every width, old inline-links/`sm:flex` and old collapsed-dots-menu tests removed.
- `components/layout/ProfileMenu.tsx` — update existing tests if they assert on button
  variant/classes; dropdown open/empty/configured-state behavior tests unchanged.
- `components/ui/HeaderActions.tsx` — update existing tests: single dropdown trigger (gear icon)
  at all sizes, action click still fires `onClick` and closes the menu, `danger` variant styling
  preserved; remove old "inline buttons at sm:" assertions.
- `components/layout/ToolHeader.tsx` (new) — renders title, renders `HeaderActions` with the
  passed `actions`, no back-arrow/subtitle markup present.
- `app/tools/mortgage/page.tsx` (or its test file) — update existing tests: no back-arrow link, no
  subtitle text, title + Share/Reset actions still reachable via the new `ToolHeader`.
