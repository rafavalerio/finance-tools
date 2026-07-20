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
