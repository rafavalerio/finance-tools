import { InputHTMLAttributes, forwardRef } from 'react'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', label, id, ...props }, ref) => {
    const checkboxId = id || label.toLowerCase().replace(/\s+/g, '-')

    return (
      <label htmlFor={checkboxId} className="flex items-center gap-2 cursor-pointer">
        <input
          ref={ref}
          id={checkboxId}
          type="checkbox"
          className={`
            w-4 h-4 rounded border-border bg-card text-accent
            focus:ring-accent focus:ring-offset-background
            ${className}
          `}
          {...props}
        />
        <span className="text-sm text-foreground">{label}</span>
      </label>
    )
  },
)

Checkbox.displayName = 'Checkbox'

export { Checkbox }
