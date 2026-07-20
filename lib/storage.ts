import {
  MortgageInputs,
  Expense,
  BuyerType,
  RepaymentFrequency,
  ExpenseFrequency,
  SplitSnapshotEntry,
} from '@/types/mortgage'

const STORAGE_KEYS = {
  MORTGAGE_INPUTS: 'finance-tools-mortgage-inputs',
  MORTGAGE_EXPENSES: 'finance-tools-mortgage-expenses',
} as const

export interface MortgageStorageData {
  inputs: MortgageInputs
  expenses: Expense[]
}

export interface DecodedMortgageData extends MortgageStorageData {
  splitSnapshot: SplitSnapshotEntry[] | null
}

// Default values - used to skip encoding defaults
const DEFAULTS: MortgageInputs = {
  loanAmount: 0,
  deposit: 0,
  interestRate: 0,
  loanTermYears: 30,
  repaymentFrequency: 'monthly',
  offsetBalance: 0,
  buyerType: 'standard',
  includeLegalFees: true,
  includeBuildingInspection: true,
  splitMemberIds: [],
  splitMode: 'even',
}

// Compact key mapping for URL encoding
// Note: splitMemberIds/splitMode are intentionally NOT encoded here — they reference the
// sender's local household member IDs, which are meaningless to a recipient. The split is
// instead shared as a frozen name+amount snapshot (see `sp` below).
const KEY_MAP = {
  loanAmount: 'p', // property price
  deposit: 'd', // deposit
  interestRate: 'r', // rate
  loanTermYears: 't', // term
  repaymentFrequency: 'f', // frequency
  offsetBalance: 'o', // offset
  buyerType: 'b', // buyer
  includeLegalFees: 'l', // legal
  includeBuildingInspection: 'i', // inspection
} as const

// Reverse mapping for decoding
const REVERSE_KEY_MAP = Object.fromEntries(
  Object.entries(KEY_MAP).map(([k, v]) => [v, k]),
) as Record<string, keyof MortgageInputs>

// Frequency abbreviations
const FREQ_MAP: Record<RepaymentFrequency, string> = {
  weekly: 'w',
  fortnightly: 'f',
  monthly: 'm',
}
const REVERSE_FREQ_MAP: Record<string, RepaymentFrequency> = {
  w: 'weekly',
  f: 'fortnightly',
  m: 'monthly',
}

// Buyer type abbreviations
const BUYER_MAP: Record<BuyerType, string> = {
  standard: 's',
  first_home_buyer: 'h',
  foreign_buyer: 'x',
}
const REVERSE_BUYER_MAP: Record<string, BuyerType> = {
  s: 'standard',
  h: 'first_home_buyer',
  x: 'foreign_buyer',
}

// Expense frequency abbreviations
const EXP_FREQ_MAP: Record<ExpenseFrequency, string> = {
  monthly: 'm',
  quarterly: 'q',
  annually: 'a',
}
const REVERSE_EXP_FREQ_MAP: Record<string, ExpenseFrequency> = {
  m: 'monthly',
  q: 'quarterly',
  a: 'annually',
}

/**
 * Save mortgage data to localStorage
 */
export function saveMortgageData(data: MortgageStorageData): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MORTGAGE_INPUTS, JSON.stringify(data.inputs))
    localStorage.setItem(STORAGE_KEYS.MORTGAGE_EXPENSES, JSON.stringify(data.expenses))
  } catch (error) {
    console.error('Failed to save to localStorage:', error)
  }
}

/**
 * Load mortgage data from localStorage
 */
export function loadMortgageData(): MortgageStorageData | null {
  try {
    const inputsJson = localStorage.getItem(STORAGE_KEYS.MORTGAGE_INPUTS)
    const expensesJson = localStorage.getItem(STORAGE_KEYS.MORTGAGE_EXPENSES)

    if (!inputsJson) return null

    // Merge with DEFAULTS so inputs saved before a field (e.g. splitMemberIds/splitMode)
    // existed still produce a complete MortgageInputs object, not one with missing keys.
    const parsedInputs = JSON.parse(inputsJson)

    return {
      inputs: {
        ...DEFAULTS,
        ...parsedInputs,
        splitMemberIds: parsedInputs.splitMemberIds ?? [...DEFAULTS.splitMemberIds],
      },
      expenses: expensesJson ? JSON.parse(expensesJson) : [],
    }
  } catch (error) {
    console.error('Failed to load from localStorage:', error)
    return null
  }
}

/**
 * Clear mortgage data from localStorage
 */
export function clearMortgageData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.MORTGAGE_INPUTS)
    localStorage.removeItem(STORAGE_KEYS.MORTGAGE_EXPENSES)
  } catch (error) {
    console.error('Failed to clear localStorage:', error)
  }
}

/**
 * Compact encoding: Only non-default values with short keys
 */
interface CompactData {
  [key: string]: string | number | boolean | CompactExpense[] | CompactSplitEntry[] | undefined
  e?: CompactExpense[] // expenses
  sp?: CompactSplitEntry[] // split snapshot (name + amount, frozen at share time)
}

interface CompactExpense {
  n: string // name
  a: number // amount
  f: string // frequency
}

interface CompactSplitEntry {
  n: string // name
  a: number // amount
}

/**
 * Encode mortgage data to a compact URL-safe string.
 * `splitSnapshot`, if provided, is embedded as frozen name+amount pairs — never member IDs.
 */
export function encodeMortgageData(
  data: MortgageStorageData,
  splitSnapshot?: SplitSnapshotEntry[],
): string {
  try {
    const compact: CompactData = {}

    // Only include non-default input values
    const inputs = data.inputs
    if (inputs.loanAmount !== DEFAULTS.loanAmount) compact[KEY_MAP.loanAmount] = inputs.loanAmount
    if (inputs.deposit !== DEFAULTS.deposit) compact[KEY_MAP.deposit] = inputs.deposit
    if (inputs.interestRate !== DEFAULTS.interestRate)
      compact[KEY_MAP.interestRate] = inputs.interestRate
    if (inputs.loanTermYears !== DEFAULTS.loanTermYears)
      compact[KEY_MAP.loanTermYears] = inputs.loanTermYears
    if (inputs.repaymentFrequency !== DEFAULTS.repaymentFrequency) {
      compact[KEY_MAP.repaymentFrequency] = FREQ_MAP[inputs.repaymentFrequency]
    }
    if (inputs.offsetBalance !== DEFAULTS.offsetBalance)
      compact[KEY_MAP.offsetBalance] = inputs.offsetBalance
    if (inputs.buyerType !== DEFAULTS.buyerType) {
      compact[KEY_MAP.buyerType] = BUYER_MAP[inputs.buyerType]
    }
    if (inputs.includeLegalFees !== DEFAULTS.includeLegalFees) {
      compact[KEY_MAP.includeLegalFees] = inputs.includeLegalFees ? 1 : 0
    }
    if (inputs.includeBuildingInspection !== DEFAULTS.includeBuildingInspection) {
      compact[KEY_MAP.includeBuildingInspection] = inputs.includeBuildingInspection ? 1 : 0
    }

    // Include expenses if any (with non-zero amounts)
    const validExpenses = data.expenses.filter((e) => e.name && e.amount > 0)
    if (validExpenses.length > 0) {
      compact.e = validExpenses.map((exp) => ({
        n: exp.name,
        a: exp.amount,
        f: EXP_FREQ_MAP[exp.frequency],
      }))
    }

    // Include the frozen split snapshot, if any
    if (splitSnapshot && splitSnapshot.length > 0) {
      compact.sp = splitSnapshot.map((entry) => ({ n: entry.name, a: entry.amount }))
    }

    const json = JSON.stringify(compact)
    // URL-safe base64: replace + with -, / with _, remove padding =
    return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  } catch (error) {
    console.error('Failed to encode mortgage data:', error)
    return ''
  }
}

/**
 * Decode mortgage data from compact URL-safe string
 */
export function decodeMortgageData(encoded: string): DecodedMortgageData | null {
  try {
    // Restore URL-safe base64 to standard base64
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    // Add padding if needed
    while (base64.length % 4) base64 += '='

    const json = atob(base64)
    const compact: CompactData = JSON.parse(json)

    // Reconstruct inputs from compact format (splitMemberIds/splitMode always come from
    // DEFAULTS — they are never part of the shared link)
    const inputs: MortgageInputs = { ...DEFAULTS, splitMemberIds: [...DEFAULTS.splitMemberIds] }

    for (const [shortKey, value] of Object.entries(compact)) {
      if (shortKey === 'e' || shortKey === 'sp') continue // handled separately

      const fullKey = REVERSE_KEY_MAP[shortKey]
      if (!fullKey) continue

      if (fullKey === 'repaymentFrequency' && typeof value === 'string') {
        inputs.repaymentFrequency = REVERSE_FREQ_MAP[value] || DEFAULTS.repaymentFrequency
      } else if (fullKey === 'buyerType' && typeof value === 'string') {
        inputs.buyerType = REVERSE_BUYER_MAP[value] || DEFAULTS.buyerType
      } else if (fullKey === 'includeLegalFees') {
        inputs.includeLegalFees = value === 1
      } else if (fullKey === 'includeBuildingInspection') {
        inputs.includeBuildingInspection = value === 1
      } else if (fullKey === 'loanAmount' && typeof value === 'number') {
        inputs.loanAmount = value
      } else if (fullKey === 'deposit' && typeof value === 'number') {
        inputs.deposit = value
      } else if (fullKey === 'interestRate' && typeof value === 'number') {
        inputs.interestRate = value
      } else if (fullKey === 'loanTermYears' && typeof value === 'number') {
        inputs.loanTermYears = value
      } else if (fullKey === 'offsetBalance' && typeof value === 'number') {
        inputs.offsetBalance = value
      }
    }

    // Reconstruct expenses
    const expenses: Expense[] = []
    if (compact.e && Array.isArray(compact.e)) {
      for (const exp of compact.e) {
        expenses.push({
          id: crypto.randomUUID(),
          name: exp.n,
          amount: exp.a,
          frequency: REVERSE_EXP_FREQ_MAP[exp.f] || 'monthly',
        })
      }
    }

    // Reconstruct the split snapshot
    const splitSnapshot: SplitSnapshotEntry[] | null =
      compact.sp && Array.isArray(compact.sp) && compact.sp.length > 0
        ? compact.sp.map((entry) => ({ name: entry.n, amount: entry.a }))
        : null

    return { inputs, expenses, splitSnapshot }
  } catch (error) {
    console.error('Failed to decode mortgage data:', error)
    return null
  }
}

/**
 * Generate shareable URL with encoded mortgage data and an optional split snapshot
 */
export function generateShareUrl(
  data: MortgageStorageData,
  splitSnapshot?: SplitSnapshotEntry[],
): string {
  const encoded = encodeMortgageData(data, splitSnapshot)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  return `${baseUrl}/tools/mortgage?data=${encoded}`
}
