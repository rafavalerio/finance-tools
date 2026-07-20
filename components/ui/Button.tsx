import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  shape?: 'default' | 'circle'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className = '', variant = 'primary', size = 'md', shape = 'default', children, ...props },
    ref,
  ) => {
    const baseStyles = `
      inline-flex items-center justify-center font-medium transition-colors
      focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background
      disabled:opacity-50 disabled:cursor-not-allowed
      ${shape === 'circle' ? 'rounded-full' : 'rounded-lg'}
    `

    const variants = {
      primary:
        'bg-accent text-background hover:bg-accent/90 hover:shadow-md hover:shadow-accent/20',
      secondary:
        'bg-card text-foreground border border-border hover:bg-border hover:border-accent/50',
      ghost: 'text-foreground border border-transparent hover:bg-card hover:border-border',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    }

    const circleSizes = {
      sm: 'p-2 text-sm',
      md: 'p-2.5 text-base',
      lg: 'p-3 text-lg',
    }

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${
          shape === 'circle' ? circleSizes[size] : sizes[size]
        } ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'

export { Button }
