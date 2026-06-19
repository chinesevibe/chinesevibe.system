function CardSkeleton({
  titleWidth = "w-28",
  rows = 4,
}: {
  titleWidth?: string
  rows?: number
}) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
      <div className="flex shrink-0 items-center justify-between border-b px-3 py-2">
        <div className={`h-4 animate-pulse rounded bg-muted ${titleWidth}`} />
        <div className="h-3 w-14 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="h-12 animate-pulse rounded-lg border border-border/50 bg-muted/60"
          />
        ))}
      </div>
    </div>
  )
}

export function DashboardWidgetsSkeleton() {
  return (
    <>
      <div className="grid min-h-0 flex-1 gap-2 md:gap-3 min-[1024px]:grid-cols-2">
        <CardSkeleton titleWidth="w-32" rows={4} />
        <CardSkeleton titleWidth="w-36" rows={4} />
      </div>

      <div className="grid min-h-0 flex-1 gap-2 md:gap-3 min-[1024px]:grid-cols-4">
        <CardSkeleton titleWidth="w-28" rows={3} />
        <CardSkeleton titleWidth="w-32" rows={5} />
        <CardSkeleton titleWidth="w-32" rows={3} />
        <CardSkeleton titleWidth="w-24" rows={4} />
      </div>

      <div className="grid min-h-0 flex-1 gap-2 md:gap-3 min-[1024px]:grid-cols-4">
        <CardSkeleton titleWidth="w-24" rows={3} />
        <CardSkeleton titleWidth="w-36" rows={5} />
        <CardSkeleton titleWidth="w-28" rows={3} />
        <CardSkeleton titleWidth="w-28" rows={3} />
      </div>
    </>
  )
}
