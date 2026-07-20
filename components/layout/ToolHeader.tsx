import { HeaderActions, type HeaderAction } from '@/components/ui'
import { PageContainer } from './PageContainer'

interface ToolHeaderProps {
  title: string
  actions: HeaderAction[]
}

export function ToolHeader({ title, actions }: ToolHeaderProps) {
  return (
    <header className="border-b border-border">
      <PageContainer className="py-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h1>
          <HeaderActions actions={actions} />
        </div>
      </PageContainer>
    </header>
  )
}
