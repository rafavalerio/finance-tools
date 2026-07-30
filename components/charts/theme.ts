import { ExpenseCategory } from '@/types/budget'

export const CHART_ACCENT_COLOR = 'rgb(217, 119, 87)'

export const CHART_PALETTE = [
  'rgb(139, 195, 156)', // green
  'rgb(147, 178, 212)', // blue
  'rgb(219, 182, 136)', // gold
  'rgb(198, 146, 184)', // purple
  'rgb(168, 198, 184)', // teal
  'rgb(212, 163, 156)', // coral
  'rgb(176, 176, 168)', // gray
]

export const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: 'rgb(48, 48, 46)',
    border: '1px solid rgb(68, 68, 64)',
    borderRadius: '8px',
    color: 'rgb(194, 192, 182)',
  },
  labelStyle: { color: 'rgb(194, 192, 182)', fontWeight: 'bold' },
}

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
