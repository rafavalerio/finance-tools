import { ReactNode } from 'react'
import { Button } from './Button'

export interface HeaderAction {
  key: string
  label: string
  icon: ReactNode
  onClick: () => void
  variant?: 'primary' | 'danger'
}

interface HeaderActionsProps {
  actions: HeaderAction[]
}

export function HeaderActions({ actions }: HeaderActionsProps) {
  if (actions.length === 0) return null

  return (
    <div className="flex shrink-0 items-center justify-end gap-2">
      {actions.map((action) => (
        <Button
          key={action.key}
          type="button"
          variant={action.variant === 'primary' ? 'primary' : 'ghost'}
          size="sm"
          onClick={action.onClick}
          className={`gap-2 ${action.variant === 'danger' ? 'text-red-300 hover:text-red-200' : ''}`}
        >
          {action.icon}
          {action.label}
        </Button>
      ))}
    </div>
  )
}
