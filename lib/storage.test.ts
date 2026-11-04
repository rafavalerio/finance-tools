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
  state: 'VIC',
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
    state: 'NSW',
    includeLegalFees: false,
    includeBuildingInspection: false,
  },
}

beforeEach(() => {
  localStorage.clear()
})

describe('saveMortgageData / loadMortgageData', () => {
  it('returns null when nothing has been saved', () => {
    expect(loadMortgageData()).toBeNull()
  })

  it('round-trips inputs through localStorage', () => {
    saveMortgageData(customData)
    expect(loadMortgageData()).toEqual(customData)
  })

  it('loads saved inputs merged over the defaults', () => {
    localStorage.setItem('finance-tools-mortgage-inputs', JSON.stringify(defaultInputs))
    expect(loadMortgageData()).toEqual({ inputs: defaultInputs })
  })
})

describe('clearMortgageData', () => {
  it('removes saved inputs', () => {
    saveMortgageData(customData)
    clearMortgageData()
    expect(loadMortgageData()).toBeNull()
  })
})

describe('encodeMortgageData / decodeMortgageData', () => {
  it('round-trips custom mortgage inputs', () => {
    const encoded = encodeMortgageData(customData)
    const decoded = decodeMortgageData(encoded)

    expect(decoded).not.toBeNull()
    expect(decoded!.inputs).toEqual(customData.inputs)
  })

  it('produces a URL-safe string with no base64 padding or unsafe characters', () => {
    const encoded = encodeMortgageData(customData)
    expect(encoded).not.toMatch(/[+/=]/)
  })

  it('decodes to the defaults when every field is default (nothing encoded)', () => {
    const encoded = encodeMortgageData({ inputs: defaultInputs })
    const decoded = decodeMortgageData(encoded)
    expect(decoded).toEqual({ inputs: defaultInputs })
  })

  it('returns null for invalid encoded input', () => {
    expect(decodeMortgageData('not-valid-base64!!')).toBeNull()
  })

  it('round-trips a non-default state', () => {
    const encoded = encodeMortgageData(customData)
    const decoded = decodeMortgageData(encoded)
    expect(decoded!.inputs.state).toBe('NSW')
  })

  it('falls back to VIC when decoding a payload with no state key (pre-existing share links)', () => {
    const encoded = encodeMortgageData({
      inputs: { ...defaultInputs, loanAmount: 500000 },
    })
    const decoded = decodeMortgageData(encoded)
    expect(decoded!.inputs.state).toBe('VIC')
  })
})

describe('generateShareUrl', () => {
  it('builds a root URL with encoded mortgage data', () => {
    const url = generateShareUrl(customData)
    expect(url).toContain('/?data=')

    const encoded = url.split('?data=')[1]
    const decoded = decodeMortgageData(encoded)
    expect(decoded!.inputs).toEqual(customData.inputs)
  })

})
