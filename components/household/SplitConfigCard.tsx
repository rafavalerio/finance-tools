'use client'

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Checkbox,
  PieChartIcon,
} from '@/components/ui'
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
