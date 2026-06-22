function FilterSkeleton() {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-border/70 bg-background shadow-sm">
      <div className="border-b border-border/60 px-4 py-4">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-3 w-72 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="space-y-2">
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            <div className="h-10 animate-pulse rounded-xl bg-muted/70" />
          </div>
        ))}
      </div>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-background">
      <div className="border-b border-border/60 px-4 py-3">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-3 w-72 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-3 p-4">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-xl border border-border/60 bg-muted/40" />
        ))}
      </div>
    </div>
  )
}

export default function Loading() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
          <div className="h-4 w-36 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-3 w-80 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              <div className="mt-3 h-8 w-16 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-3 w-32 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
      <FilterSkeleton />
      <div className="min-h-0 flex-1">
        <TableSkeleton />
      </div>
    </div>
  )
}
