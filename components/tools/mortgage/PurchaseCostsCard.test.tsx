import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PurchaseCostsCard } from './PurchaseCostsCard'
import { PurchaseCosts } from '@/types/mortgage'

const costs: PurchaseCosts = {
  stampDuty: 21970,
  stampDutyDescription: 'Standard Victorian stamp duty',
  legalFees: 1500,
  titleRegistration: 118,
  buildingInspection: 500,
  mortgageRegistration: 122,
  totalCosts: 24210,
  effectiveDeposit: 75790,
  depositPercentage: 15.16,
  requiresLMI: true,
  estimatedLMI: 8500,
}

describe('PurchaseCostsCard', () => {
  it('shows an empty state when there are no costs', () => {
    render(<PurchaseCostsCard costs={null} deposit={0} propertyPrice={0} state="VIC" />)
    expect(screen.getByText('Enter property details to see purchase costs.')).toBeInTheDocument()
  })

  it('renders the cost breakdown when costs are provided', () => {
    render(<PurchaseCostsCard costs={costs} deposit={100000} propertyPrice={500000} state="VIC" />)
    expect(screen.getByText('Stamp Duty')).toBeInTheDocument()
    expect(screen.getByText('Total Upfront Costs')).toBeInTheDocument()
    expect(screen.getByText('Effective Deposit')).toBeInTheDocument()
  })

  it('shows the LMI warning when required', () => {
    render(<PurchaseCostsCard costs={costs} deposit={100000} propertyPrice={500000} state="VIC" />)
    expect(screen.getByText('Lenders Mortgage Insurance (LMI) Required')).toBeInTheDocument()
  })

  it('hides the LMI warning when not required', () => {
    render(
      <PurchaseCostsCard
        costs={{ ...costs, requiresLMI: false }}
        deposit={100000}
        propertyPrice={500000}
        state="VIC"
      />,
    )
    expect(screen.queryByText('Lenders Mortgage Insurance (LMI) Required')).not.toBeInTheDocument()
  })

  it('shows the selected state in the header', () => {
    render(<PurchaseCostsCard costs={costs} deposit={100000} propertyPrice={500000} state="NSW" />)
    expect(screen.getByText(/Purchase Costs/).textContent).toContain('NSW')
  })
})
