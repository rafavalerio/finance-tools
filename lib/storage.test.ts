import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveMortgageData,
  loadMortgageData,
  clearMortgageData,
  encodeMortgageData,
  decodeMortgageData,
  generateShareUrl,
  MortgageStorageData,
} from './storage'
import { MortgageInputs } from '@/types/mortgage'

const defaultInputs: MortgageInputs = {
  loanAmount: 0,
  deposit: 0,
  interestRate: 0,
  loanTermYears: 30,
  repaymentFrequency: 'monthly',
  offsetBalance: 0,
  buyerType: 'standard',
  includeLegalFees: true,
  includeBuildingInspection: true,
}

const customData: MortgageStorageData = {
  inputs: {
    loanAmount: 650000,
    deposit: 120000,
    interestRate: 6.25,
    loanTermYears: 25,
    repaymentFrequency: 'fortnightly',
    offsetBalance: 15000,
    buyerType: 'first_home_buyer',
    includeLegalFees: false,
    includeBuildingInspection: false,
  },
  expenses: [
    { id: '1', name: 'Council Rates', amount: 400, frequency: 'quarterly' },
    { id: '2', name: 'Home Insurance', amount: 1500, frequency: 'annually' },
  ],
}

beforeEach(() => {
  localStorage.clear()
})

describe('saveMortgageData / loadMortgageData', () => {
  it('returns null when nothing has been saved', () => {
    expect(loadMortgageData()).toBeNull()
  })

  it('round-trips inputs and expenses through localStorage', () => {
    saveMortgageData(customData)
    expect(loadMortgageData()).toEqual(customData)
  })

  it('defaults expenses to an empty array if none were saved', () => {
    localStorage.setItem('finance-tools-mortgage-inputs', JSON.stringify(defaultInputs))
    expect(loadMortgageData()).toEqual({ inputs: defaultInputs, expenses: [] })
  })
})

describe('clearMortgageData', () => {
  it('removes saved inputs and expenses', () => {
    saveMortgageData(customData)
    clearMortgageData()
    expect(loadMortgageData()).toBeNull()
  })
})

describe('encodeMortgageData / decodeMortgageData', () => {
  it('round-trips custom inputs and expenses', () => {
    const encoded = encodeMortgageData(customData)
    const decoded = decodeMortgageData(encoded)

    expect(decoded).not.toBeNull()
    expect(decoded!.inputs).toEqual(customData.inputs)
    expect(decoded!.expenses).toHaveLength(2)
    expect(decoded!.expenses[0]).toMatchObject({
      name: 'Council Rates',
      amount: 400,
      frequency: 'quarterly',
    })
  })

  it('produces a URL-safe string with no base64 padding or unsafe characters', () => {
    const encoded = encodeMortgageData(customData)
    expect(encoded).not.toMatch(/[+/=]/)
  })

  it('decodes to the defaults when every field is default (nothing encoded)', () => {
    const encoded = encodeMortgageData({ inputs: defaultInputs, expenses: [] })
    const decoded = decodeMortgageData(encoded)
    expect(decoded).toEqual({ inputs: defaultInputs, expenses: [] })
  })

  it('omits expenses with no name or non-positive amount', () => {
    const encoded = encodeMortgageData({
      inputs: defaultInputs,
      expenses: [
        { id: '1', name: '', amount: 100, frequency: 'monthly' },
        { id: '2', name: 'Empty', amount: 0, frequency: 'monthly' },
        { id: '3', name: 'Valid', amount: 50, frequency: 'monthly' },
      ],
    })
    const decoded = decodeMortgageData(encoded)
    expect(decoded!.expenses).toHaveLength(1)
    expect(decoded!.expenses[0].name).toBe('Valid')
  })

  it('returns null for invalid encoded input', () => {
    expect(decodeMortgageData('not-valid-base64!!')).toBeNull()
  })
})

describe('generateShareUrl', () => {
  it('builds a URL pointing at the mortgage tool with encoded data', () => {
    const url = generateShareUrl(customData)
    expect(url).toContain('/tools/mortgage?data=')

    const encoded = url.split('?data=')[1]
    const decoded = decodeMortgageData(encoded)
    expect(decoded!.inputs).toEqual(customData.inputs)
  })
})
