export interface NavLink {
  key: string
  label: string
  href: string
  disabled?: boolean
}

export const NAV_LINKS: NavLink[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/' },
  { key: 'mortgage', label: 'Mortgage', href: '/tools/mortgage' },
  { key: 'budget', label: 'Budget', href: '#', disabled: true },
]
