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
