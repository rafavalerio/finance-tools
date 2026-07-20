import { describe, it, expect } from 'vitest'
import { computeSplit, formatCompactIncome } from './household'
import { HouseholdMember } from '@/types/household'

describe('computeSplit', () => {
  it('returns an empty object for no members', () => {
    expect(computeSplit([], 'even')).toEqual({})
  })

  it('gives a single member the full share', () => {
    const members: HouseholdMember[] = [{ id: 'a', name: 'Alex', income: 100000 }]
    expect(computeSplit(members, 'even')).toEqual({ a: 1 })
  })

  it('splits evenly across members when mode is even', () => {
    const members: HouseholdMember[] = [
      { id: 'a', name: 'Alex', income: 100000 },
      { id: 'b', name: 'Sam', income: 50000 },
      { id: 'c', name: 'Jo', income: 0 },
    ]
    const result = computeSplit(members, 'even')
    expect(result.a).toBeCloseTo(1 / 3)
    expect(result.b).toBeCloseTo(1 / 3)
    expect(result.c).toBeCloseTo(1 / 3)
  })

  it('splits proportional to income when mode is income and all incomes are positive', () => {
    const members: HouseholdMember[] = [
      { id: 'a', name: 'Alex', income: 100000 },
      { id: 'b', name: 'Sam', income: 50000 },
    ]
    const result = computeSplit(members, 'income')
    expect(result.a).toBeCloseTo(2 / 3)
    expect(result.b).toBeCloseTo(1 / 3)
  })

  it('falls back to even split when any included member has no income', () => {
    const members: HouseholdMember[] = [
      { id: 'a', name: 'Alex', income: 100000 },
      { id: 'b', name: 'Sam', income: 0 },
    ]
    const result = computeSplit(members, 'income')
    expect(result.a).toBeCloseTo(0.5)
    expect(result.b).toBeCloseTo(0.5)
  })
})

describe('formatCompactIncome', () => {
  it('formats amounts of 1000 or more in thousands with a lowercase k', () => {
    expect(formatCompactIncome(175000)).toBe('$175k')
    expect(formatCompactIncome(1000)).toBe('$1k')
  })

  it('formats amounts under 1000 as a plain dollar figure', () => {
    expect(formatCompactIncome(500)).toBe('$500')
    expect(formatCompactIncome(0)).toBe('$0')
  })
})
