import { HouseholdMember, SplitMode } from '@/types/household'

/**
 * Compute each member's share (0-1) of a shared cost.
 * Income-weighted mode falls back to an even split if any member's income is not positive.
 */
export function computeSplit(members: HouseholdMember[], mode: SplitMode): Record<string, number> {
  if (members.length === 0) return {}

  const useIncome = mode === 'income' && members.every((member) => member.income > 0)

  if (!useIncome) {
    const ratio = 1 / members.length
    return Object.fromEntries(members.map((member) => [member.id, ratio]))
  }

  const totalIncome = members.reduce((sum, member) => sum + member.income, 0)
  return Object.fromEntries(members.map((member) => [member.id, member.income / totalIncome]))
}

/**
 * Compact currency formatting for dashboard summary tiles (e.g. "$175k").
 */
export function formatCompactIncome(amount: number): string {
  if (amount >= 1000) {
    return `$${Math.round(amount / 1000)}k`
  }
  return `$${Math.round(amount)}`
}
