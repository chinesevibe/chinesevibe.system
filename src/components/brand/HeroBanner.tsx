import { formatThaiLongDate } from "@/lib/datetime/thailand"

export function HeroBanner({
  title,
  subtitle,
  userName,
  compact = false,
}: {
  title: string
  subtitle: string
  userName: string
  compact?: boolean
}) {
  return (
    <div
      className={
        compact
          ? "flex shrink-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
          : "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      }
    >
      <div className="min-w-0">
        <p
          className={
            compact
              ? "text-xs text-muted-foreground"
              : "text-sm text-muted-foreground"
          }
        >
          ยินดีต้อนรับกลับ, {userName} 👋
        </p>
        <h1
          className={
            compact
              ? "text-lg font-bold tracking-tight text-foreground md:text-xl"
              : "mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl"
          }
        >
          {title}
        </h1>
        <p
          className={
            compact
              ? "mt-0.5 line-clamp-1 max-w-2xl text-xs text-muted-foreground"
              : "mt-2 max-w-2xl text-sm text-muted-foreground"
          }
        >
          {subtitle}
        </p>
      </div>
      <p
        className={
          compact
            ? "shrink-0 text-[11px] text-muted-foreground sm:text-right"
            : "shrink-0 text-sm text-muted-foreground sm:text-right"
        }
      >
        วันนี้ {formatThaiLongDate()}
      </p>
    </div>
  )
}
