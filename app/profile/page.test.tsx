import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProfilePage from './page'

beforeEach(() => {
  localStorage.clear()
})

describe('ProfilePage', () => {
  it('shows an empty state with no members', async () => {
    render(<ProfilePage />)
    expect(await screen.findByText('No household members added yet.')).toBeInTheDocument()
  })

  it('adds a member and lets it be edited', async () => {
    render(<ProfilePage />)
    await screen.findByText('No household members added yet.')

    await userEvent.click(screen.getByRole('button', { name: 'Add member' }))
    await userEvent.type(screen.getByLabelText('Name'), 'Rafael')
    await userEvent.type(screen.getByLabelText('Annual Income'), '95000')

    expect(screen.getByLabelText('Name')).toHaveValue('Rafael')
    expect(screen.getByLabelText('Annual Income')).toHaveValue(95000)
  })

  it('shows the split config card once two members exist', async () => {
    render(<ProfilePage />)
    await screen.findByText('No household members added yet.')

    await userEvent.click(screen.getByRole('button', { name: 'Add member' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add member' }))

    expect(await screen.findByText('Cost Splitting')).toBeInTheDocument()
  })

  it('does not show the split config card with fewer than two members', async () => {
    render(<ProfilePage />)
    await screen.findByText('No household members added yet.')

    await userEvent.click(screen.getByRole('button', { name: 'Add member' }))

    expect(screen.queryByText('Cost Splitting')).not.toBeInTheDocument()
  })
})
