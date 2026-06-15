export function DataTableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/80 bg-background">
      {children}
    </div>
  )
}
