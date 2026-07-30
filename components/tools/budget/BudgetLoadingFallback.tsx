export function BudgetLoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div
          className={`
            w-8 h-8 border-2 border-accent border-t-transparent
            rounded-full animate-spin mx-auto mb-4
          `}
        />
        <p className="text-muted">Loading budget...</p>
      </div>
    </div>
  )
}
