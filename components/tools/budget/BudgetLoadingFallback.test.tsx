import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BudgetLoadingFallback } from './BudgetLoadingFallback'

describe('BudgetLoadingFallback', () => {
  it('shows a loading message', () => {
    render(<BudgetLoadingFallback />)
    expect(screen.getByText('Loading budget...')).toBeInTheDocument()
  })
})
