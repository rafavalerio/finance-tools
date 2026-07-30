import {
  Expense,
  ExpenseCategory,
  ExpenseFrequency,
  ExpenseBreakdownItem,
  BudgetSummary,
  MemberBudgetShare,
} from '@/types/budget'
import { HouseholdMember, HouseholdSplitConfig } from '@/types/household'
import { computeSplit } from './household'

/**
 * Every expense category with its display label, in the order they appear in the
 * category picker.
 */
export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'housing', label: 'Housing' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'transport', label: 'Transport' },
  { value: 'groceries', label: 'Groceries' },
  { value: 'health', label: 'Health' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'other', label: 'Other' },
]

const CATEGORY_LABELS: Record<ExpenseCategory, string> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((category) => [category.value, category.label]),
) as Record<ExpenseCategory, string>

/**
 * Convert an expense amount to its monthly equivalent
 */
export function convertToMonthly(amount: number, frequency: ExpenseFrequency): number {
  switch (frequency) {
    case 'monthly':
      return amount
    case 'quarterly':
      return amount / 3
    case 'annually':
      return amount / 12
  }
}

/** Rows the user has actually filled in — blank or zero rows never count toward totals. */
function usableExpenses(expenses: Expense[]): Expense[] {
  return expenses.filter((expense) => expense.name && expense.amount > 0)
}

/**
 * Household monthly income: the take-home override when set, otherwise gross annual
 * income summed across every member and divided by twelve.
 */
export function computeMonthlyIncome(
  members: HouseholdMember[],
  takeHomeOverride: number | null,
): number {
  if (takeHomeOverride !== null) return takeHomeOverride
  return members.reduce((total, member) => total + member.income, 0) / 12
}

/**
 * One breakdown entry per category with a positive monthly total, preceded by a
 * Mortgage entry when there is a repayment to show. Colours are passed in rather than
 * imported so this module stays free of UI dependencies.
 */
export function computeCategoryBreakdown(
  expenses: Expense[],
  mortgageMonthly: number,
  categoryColors: Record<ExpenseCategory, string>,
  mortgageColor: string,
): ExpenseBreakdownItem[] {
  const items: ExpenseBreakdownItem[] = []

  if (mortgageMonthly > 0) {
    items.push({ name: 'Mortgage', value: mortgageMonthly, color: mortgageColor })
  }

  const totals = new Map<ExpenseCategory, number>()
  for (const expense of usableExpenses(expenses)) {
    const monthly = convertToMonthly(expense.amount, expense.frequency)
    totals.set(expense.category, (totals.get(expense.category) ?? 0) + monthly)
  }

  for (const { value: category } of EXPENSE_CATEGORIES) {
    const total = totals.get(category)
    if (total && total > 0) {
      items.push({
        name: CATEGORY_LABELS[category],
        value: total,
        color: categoryColors[category],
      })
    }
  }

  return items
}

/**
 * Monthly income, total monthly expenses (mortgage included), and what is left over.
 * A negative surplus is a valid result, not an error.
 */
export function computeBudgetSummary(
  expenses: Expense[],
  mortgageMonthly: number,
  members: HouseholdMember[],
  takeHomeOverride: number | null,
): BudgetSummary {
  const monthlyIncome = computeMonthlyIncome(members, takeHomeOverride)
  const monthlyExpenses = usableExpenses(expenses).reduce(
    (total, expense) => total + convertToMonthly(expense.amount, expense.frequency),
    mortgageMonthly,
  )

  return { monthlyIncome, monthlyExpenses, surplus: monthlyIncome - monthlyExpenses }
}

/**
 * What each household member pays of the total monthly outgoing, and what is left of
 * their own income afterwards. Empty unless 2+ members are selected in the split config.
 *
 * The take-home override is a single household figure, so it is apportioned across the
 * included members in proportion to their gross incomes (a 60/40 earning pair splits it
 * 60/40), falling back to an even split when the gross incomes sum to zero.
 */
export function computeMemberBudgetShares(
  members: HouseholdMember[],
  splitConfig: HouseholdSplitConfig,
  takeHomeOverride: number | null,
  totalMonthlyOutgoing: number,
): MemberBudgetShare[] {
  const included = members.filter((member) => splitConfig.memberIds.includes(member.id))
  if (included.length < 2) return []

  const ratios = computeSplit(included, splitConfig.mode)
  const totalGross = included.reduce((total, member) => total + member.income, 0)

  return included.map((member) => {
    const share = totalMonthlyOutgoing * ratios[member.id]
    const monthlyIncome =
      takeHomeOverride === null
        ? member.income / 12
        : totalGross > 0
          ? takeHomeOverride * (member.income / totalGross)
          : takeHomeOverride / included.length

    return {
      memberId: member.id,
      name: member.name,
      share,
      monthlyIncome,
      leftover: monthlyIncome - share,
    }
  })
}
