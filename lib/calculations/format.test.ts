import { describe, it, expect } from 'vitest'
import { formatCurrency, formatCurrencyPrecise } from './format'

describe('formatCurrency', () => {
  it('formats AUD with no decimal places', () => {
    expect(formatCurrency(1234.56)).toBe('$1,235')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0')
  })
})

describe('formatCurrencyPrecise', () => {
  it('formats AUD with two decimal places', () => {
    expect(formatCurrencyPrecise(1234.5)).toBe('$1,234.50')
  })

  it('formats negative amounts', () => {
    expect(formatCurrencyPrecise(-250)).toBe('-$250.00')
  })
})
