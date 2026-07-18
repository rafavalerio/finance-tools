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
  /** A single icon-only control for the header's corner (e.g. an "add" button).
   * Sits top-right, aligned with the title, at every screen size. */
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
        className={`mb-4 flex items-start justify-between gap-3 ${className}`}
        {...props}
      >
        <div className="min-w-0">{children}</div>
        <div className="shrink-0">{actions}</div>
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
