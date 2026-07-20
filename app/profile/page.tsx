'use client'

import { MemberList, useHousehold } from '@/components/household'

export default function ProfilePage() {
  const { members, addMember, updateMember, removeMember } = useHousehold()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-foreground">Household</h1>
          <p className="text-base text-muted mt-2">
            Add everyone in your household so tools like the mortgage calculator can split costs
            accurately.
          </p>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MemberList
          members={members}
          onAdd={addMember}
          onChange={updateMember}
          onRemove={removeMember}
        />
      </main>
    </div>
  )
}
