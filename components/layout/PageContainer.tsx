import { ReactNode } from 'react'

interface PageContainerProps {
  children: ReactNode
  className?: string
}

export function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className={`max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
  )
}
