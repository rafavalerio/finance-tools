import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MortgageLoadingFallback } from './MortgageLoadingFallback'

describe('MortgageLoadingFallback', () => {
  it('renders a loading message', () => {
    render(<MortgageLoadingFallback />)
    expect(screen.getByText('Loading calculator...')).toBeInTheDocument()
  })
})
