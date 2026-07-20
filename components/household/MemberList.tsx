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
