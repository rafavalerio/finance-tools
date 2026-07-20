import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemberItem } from './MemberItem'
import { HouseholdMember } from '@/types/household'

const member: HouseholdMember = { id: '1', name: 'Rafael', income: 95000 }

describe('MemberItem', () => {
  it('renders the member fields', () => {
    render(<MemberItem member={member} onChange={() => {}} onRemove={() => {}} />)
    expect(screen.getByLabelText('Name')).toHaveValue('Rafael')
    expect(screen.getByLabelText('Annual Income')).toHaveValue(95000)
  })

  it('calls onChange with the updated name', async () => {
    const onChange = vi.fn()
    render(<MemberItem member={member} onChange={onChange} onRemove={() => {}} />)
    await userEvent.type(screen.getByLabelText('Name'), '!')
    expect(onChange).toHaveBeenCalledWith({ ...member, name: 'Rafael!' })
  })

  it('calls onRemove when the remove button is clicked', async () => {
    const onRemove = vi.fn()
    render(<MemberItem member={member} onChange={() => {}} onRemove={onRemove} />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove member' }))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('scopes field ids to the member id so multiple rows do not collide', () => {
    render(<MemberItem member={member} onChange={() => {}} onRemove={() => {}} />)
    expect(screen.getByLabelText('Name')).toHaveAttribute('id', 'member-name-1')
  })
})
