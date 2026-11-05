import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MortgageCalculatorPage from './page'

const emptySearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({ useSearchParams: () => emptySearchParams }))

beforeEach(() => {
  localStorage.clear()
})

describe('MortgageCalculatorPage', () => {
  it('shows the mortgage calculator directly on the home page', () => {
    render(<MortgageCalculatorPage />)
    expect(screen.getByRole('link', { name: 'Mortgage Planner home' })).toHaveAttribute('href', '/')
    expect(screen.getByText('Mortgage Calculator')).toBeInTheDocument()
    expect(screen.getByLabelText('Property Price')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
  })

  it('opens the share modal with a generated root link', async () => {
    render(<MortgageCalculatorPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Share' }))
    expect(screen.getByDisplayValue(/\/?\?data=/)).toBeInTheDocument()
  })
})
