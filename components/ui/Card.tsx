import { HTMLAttributes, forwardRef } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated'
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-card border border-border',
      elevated: 'bg-card border border-border shadow-lg shadow-black/20',
    }

    return (
      <div ref={ref} className={`rounded-xl p-6 ${variants[variant]} ${className}`} {...props}>
        {children}
      </div>
    )
  },
)

Card.displayName = 'Card'

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Buttons or controls for the header's right side (e.g. "Add Expense"). Stacks
   * below the title on mobile and sits inline on the right from `sm:` up. */
  actions?: React.ReactNode
}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = '', children, actions, ...props }, ref) => {
    if (!actions) {
      return (
        <div ref={ref} className={`mb-4 ${className}`} {...props}>
          {children}
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={`mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
        {...props}
      >
        <div className="min-w-0">{children}</div>
        <div className="flex items-center gap-2 justify-end sm:shrink-0">{actions}</div>
      </div>
    )
  },
)

CardHeader.displayName = 'CardHeader'

type CardTitleProps = HTMLAttributes<HTMLHeadingElement>

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <h3 ref={ref} className={`text-xl font-semibold text-foreground ${className}`} {...props}>
        {children}
      </h3>
    )
  },
)

CardTitle.displayName = 'CardTitle'

type CardContentProps = HTMLAttributes<HTMLDivElement>

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={className} {...props}>
        {children}
      </div>
    )
  },
)

CardContent.displayName = 'CardContent'

export { Card, CardHeader, CardTitle, CardContent }
