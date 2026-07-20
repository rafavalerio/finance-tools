import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemberList } from './MemberList'
import { HouseholdMember } from '@/types/household'

describe('MemberList', () => {
  it('shows an empty state when there are no members', () => {
    render(<MemberList members={[]} onAdd={() => {}} onChange={() => {}} onRemove={() => {}} />)
    expect(screen.getByText('No household members added yet.')).toBeInTheDocument()
  })

  it('renders one row per member', () => {
    const members: HouseholdMember[] = [
      { id: '1', name: 'Rafael', income: 95000 },
      { id: '2', name: 'Partner', income: 80000 },
    ]
    render(
      <MemberList members={members} onAdd={() => {}} onChange={() => {}} onRemove={() => {}} />,
    )
    expect(screen.getAllByLabelText('Name')).toHaveLength(2)
  })

  it('calls onAdd when "Add member" is clicked', async () => {
    const onAdd = vi.fn()
    render(<MemberList members={[]} onAdd={onAdd} onChange={() => {}} onRemove={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Add member' }))
    expect(onAdd).toHaveBeenCalledTimes(1)
  })

  it('calls onRemove with the member id when its remove button is clicked', async () => {
    const onRemove = vi.fn()
    const members: HouseholdMember[] = [{ id: '1', name: 'Rafael', income: 95000 }]
    render(
      <MemberList members={members} onAdd={() => {}} onChange={() => {}} onRemove={onRemove} />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Remove member' }))
    expect(onRemove).toHaveBeenCalledWith('1')
  })
})
