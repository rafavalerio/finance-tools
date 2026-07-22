import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import HomePage from './page'
import { MortgageInputs } from '@/types/mortgage'

const savedInputs: MortgageInputs = {
  loanAmount: 600000,
  deposit: 100000,
  interestRate: 6,
  loanTermYears: 30,
  repaymentFrequency: 'monthly',
  offsetBalance: 0,
  buyerType: 'standard',
  state: 'VIC',
  includeLegalFees: true,
  includeBuildingInspection: true,
}

beforeEach(() => {
  localStorage.clear()
})

describe('HomePage', () => {
  it('shows an empty-state CTA for mortgage when nothing is configured', async () => {
    render(<HomePage />)
    expect(await screen.findByText('Get started with the mortgage calculator.')).toBeInTheDocument()
  })

  it('shows the mortgage snapshot once loan details are saved', async () => {
    localStorage.setItem('finance-tools-mortgage-inputs', JSON.stringify(savedInputs))
    localStorage.setItem('finance-tools-mortgage-expenses', JSON.stringify([]))
    render(<HomePage />)
    expect(await screen.findByText(/\/mo$/)).toBeInTheDocument()
  })

  it('always shows the budget placeholder', () => {
    render(<HomePage />)
    expect(screen.getByText('Budget Planner')).toBeInTheDocument()
    expect(screen.getByText('Coming soon.')).toBeInTheDocument()
  })

  it('does not show any household-related content', async () => {
    render(<HomePage />)
    await screen.findByText('Get started with the mortgage calculator.')
    expect(screen.queryByText(/household/i)).not.toBeInTheDocument()
  })
})
