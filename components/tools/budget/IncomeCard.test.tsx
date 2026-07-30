import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IncomeCard } from './IncomeCard'

describe('IncomeCard', () => {
  it('shows the gross monthly income derived from the household', () => {
    render(
      <IncomeCard
        grossMonthlyIncome={12500}
        takeHomeOverride={null}
        onTakeHomeChange={() => {}}
        hasMembers
      />,
    )
    expect(screen.getByText('$12,500.00')).toBeInTheDocument()
    expect(screen.getByText(/before tax/i)).toBeInTheDocument()
  })

  it('prompts for household setup when there are no members', () => {
    render(
      <IncomeCard
        grossMonthlyIncome={0}
        takeHomeOverride={null}
        onTakeHomeChange={() => {}}
        hasMembers={false}
      />,
    )
    expect(screen.getByRole('link', { name: /household/i })).toHaveAttribute('href', '/profile')
  })

  it('emits a number when a take-home amount is entered', async () => {
    const onTakeHomeChange = vi.fn()
    render(
      <IncomeCard
        grossMonthlyIncome={12500}
        takeHomeOverride={null}
        onTakeHomeChange={onTakeHomeChange}
        hasMembers
      />,
    )
    await userEvent.type(screen.getByLabelText('Monthly take-home'), '9')
    expect(onTakeHomeChange).toHaveBeenCalledWith(9)
  })

  it('emits null when the take-home field is cleared', async () => {
    const onTakeHomeChange = vi.fn()
    render(
      <IncomeCard
        grossMonthlyIncome={12500}
        takeHomeOverride={9000}
        onTakeHomeChange={onTakeHomeChange}
        hasMembers
      />,
    )
    await userEvent.clear(screen.getByLabelText('Monthly take-home'))
    expect(onTakeHomeChange).toHaveBeenCalledWith(null)
  })

  it('offers a reset control only while an override is set', async () => {
    const onTakeHomeChange = vi.fn()
    const { rerender } = render(
      <IncomeCard
        grossMonthlyIncome={12500}
        takeHomeOverride={null}
        onTakeHomeChange={onTakeHomeChange}
        hasMembers
      />,
    )
    expect(screen.queryByRole('button', { name: /use gross/i })).not.toBeInTheDocument()

    rerender(
      <IncomeCard
        grossMonthlyIncome={12500}
        takeHomeOverride={9000}
        onTakeHomeChange={onTakeHomeChange}
        hasMembers
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /use gross/i }))
    expect(onTakeHomeChange).toHaveBeenCalledWith(null)
  })
})
