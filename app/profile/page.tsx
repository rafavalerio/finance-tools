'use client'

import { MemberList, SplitConfigCard, useHousehold } from '@/components/household'
import { PageContainer } from '@/components/layout'

export default function ProfilePage() {
  const {
    members,
    splitConfig,
    addMember,
    updateMember,
    removeMember,
    toggleSplitMember,
    setSplitMode,
  } = useHousehold()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <PageContainer className="py-8">
          <h1 className="text-3xl font-bold text-foreground">Household</h1>
          <p className="text-base text-muted mt-2">
            Add everyone in your household so tools like the mortgage calculator can split costs
            accurately.
          </p>
        </PageContainer>
      </header>
      <main>
        <PageContainer className="py-8 space-y-6">
          <MemberList
            members={members}
            onAdd={addMember}
            onChange={updateMember}
            onRemove={removeMember}
          />
          <SplitConfigCard
            members={members}
            splitMemberIds={splitConfig.memberIds}
            splitMode={splitConfig.mode}
            onToggleMember={toggleSplitMember}
            onModeChange={setSplitMode}
          />
        </PageContainer>
      </main>
    </div>
  )
}
