'use client'

import {
  Input,
  Select,
  Checkbox,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CalculatorIcon,
} from '@/components/ui'
import { MortgageInputs, RepaymentFrequency, BuyerType, AustralianState } from '@/types/mortgage'

interface MortgageFormProps {
  inputs: MortgageInputs
  onChange: (inputs: MortgageInputs) => void
}

const repaymentFrequencyOptions = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'weekly', label: 'Weekly' },
]

const buyerTypeOptions = [
  { value: 'standard', label: 'Standard Buyer' },
  { value: 'first_home_buyer', label: 'First Home Buyer' },
  { value: 'foreign_buyer', label: 'Foreign Buyer' },
]

const stateOptions = [
  { value: 'NSW', label: 'New South Wales' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'SA', label: 'South Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'ACT', label: 'Australian Capital Territory' },
  { value: 'NT', label: 'Northern Territory' },
]

export function MortgageForm({ inputs, onChange }: MortgageFormProps) {
  const handleChange = (field: keyof MortgageInputs, value: string | number | boolean) => {
    onChange({
      ...inputs,
      [field]: value,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalculatorIcon width="20" height="20" className="text-accent" />
          Loan Details
        </CardTitle>
        <p className="text-sm text-muted mt-1">{inputs.state} stamp duty rates applied</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Property Price"
              type="number"
              prefix="$"
              placeholder="500000"
              value={inputs.loanAmount || ''}
              onChange={(e) => handleChange('loanAmount', parseFloat(e.target.value) || 0)}
            />
            <Input
              label="Your Deposit"
              type="number"
              prefix="$"
              placeholder="100000"
              value={inputs.deposit || ''}
              onChange={(e) => handleChange('deposit', parseFloat(e.target.value) || 0)}
            />
            <Input
              label="Interest Rate (% p.a.)"
              type="number"
              suffix="%"
              placeholder="6.5"
              step="0.01"
              value={inputs.interestRate || ''}
              onChange={(e) => handleChange('interestRate', parseFloat(e.target.value) || 0)}
            />
            <Input
              label="Loan Term (years)"
              type="number"
              suffix="years"
              placeholder="30"
              value={inputs.loanTermYears || ''}
              onChange={(e) => handleChange('loanTermYears', parseInt(e.target.value) || 0)}
            />
            <Select
              label="Repayment Frequency"
              options={repaymentFrequencyOptions}
              value={inputs.repaymentFrequency}
              onChange={(e) =>
                handleChange('repaymentFrequency', e.target.value as RepaymentFrequency)
              }
            />
            <Select
              label="Buyer Type"
              options={buyerTypeOptions}
              value={inputs.buyerType}
              onChange={(e) => handleChange('buyerType', e.target.value as BuyerType)}
            />
            <Select
              label="State"
              options={stateOptions}
              value={inputs.state}
              onChange={(e) => handleChange('state', e.target.value as AustralianState)}
            />
            <Input
              label="Offset Account Balance"
              type="number"
              prefix="$"
              placeholder="0"
              value={inputs.offsetBalance || ''}
              onChange={(e) => handleChange('offsetBalance', parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* Optional costs checkboxes */}
          <div className="pt-4 border-t border-border">
            <p className="text-sm font-medium text-foreground mb-3">Include in cost estimate:</p>
            <div className="flex flex-wrap gap-4">
              <Checkbox
                label="Legal/Conveyancing (~$2,000)"
                checked={inputs.includeLegalFees}
                onChange={(e) => handleChange('includeLegalFees', e.target.checked)}
              />
              <Checkbox
                label="Building & Pest Inspection (~$650)"
                checked={inputs.includeBuildingInspection}
                onChange={(e) => handleChange('includeBuildingInspection', e.target.checked)}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
