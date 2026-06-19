function SidebarSkeleton() {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-border/70 bg-card/60 p-4 lg:flex lg:flex-col lg:gap-4">
      <div className="h-8 w-36 animate-pulse rounded bg-muted" />
      <div className="space-y-2">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="h-10 animate-pulse rounded-lg bg-muted/70"
          />
        ))}
      </div>
    </aside>
  )
}

function HeaderSkeleton() {
  return (
    <div className="flex items-center justify-between border-b border-border/70 bg-card/60 px-3 py-3 md:px-4 lg:px-5">
      <div className="h-8 w-40 animate-pulse rounded bg-muted" />
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
        <div className="h-9 w-24 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  )
}

function KpiSkeleton() {
  return (
    <div className="rounded-xl border border-border/80 bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        <div className="size-8 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="mt-3 h-7 w-16 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-3 w-28 animate-pulse rounded bg-muted" />
    </div>
  )
}

function WidgetSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        <div className="h-3 w-12 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-12 animate-pulse rounded-lg border border-border/50 bg-muted/60"
          />
        ))}
      </div>
    </div>
  )
}

export default function Loading() {
  return (
    <div className="flex h-dvh max-h-dvh overflow-hidden bg-background">
      <SidebarSkeleton />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <HeaderSkeleton />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3 md:p-4 lg:p-5">
          <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden md:gap-3">
            <div className="rounded-2xl border border-border/80 bg-card/70 p-4 shadow-sm">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="mt-3 h-8 w-40 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-3 w-48 animate-pulse rounded bg-muted" />
            </div>

            <div className="grid shrink-0 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 md:gap-3">
              {Array.from({ length: 6 }, (_, index) => (
                <KpiSkeleton key={index} />
              ))}
            </div>

            <div className="grid min-h-0 flex-1 gap-2 md:gap-3 min-[1024px]:grid-cols-2">
              <WidgetSkeleton />
              <WidgetSkeleton />
            </div>

            <div className="grid min-h-0 flex-1 gap-2 md:gap-3 min-[1024px]:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <WidgetSkeleton key={index} />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
