import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export function KpiCard({
  label,
  value,
  detail,
  trend,
  icon: Icon,
  accent = "default",
  compact = false,
  iconSize = "default",
}: {
  label: string
  value: string | number
  detail?: string
  trend?: string
  icon?: LucideIcon
  accent?: "default" | "warning" | "success" | "info" | "purple"
  compact?: boolean
  iconSize?: "default" | "lg"
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-card shadow-sm",
        compact ? "p-2.5 md:p-3" : "p-4"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={compact ? "text-xs text-muted-foreground" : "text-sm text-muted-foreground"}>
          {label}
        </p>
        {Icon ? (
          <span
            className={cn(
              "inline-flex shrink-0 items-center justify-center",
              iconSize === "lg"
                ? "size-8 rounded-lg"
                : compact
                  ? "rounded-md p-1.5"
                  : "rounded-lg p-2",
              accent === "warning" && "bg-amber-100 text-amber-700",
              accent === "success" && "bg-emerald-100 text-emerald-700",
              accent === "info" && "bg-sky-100 text-sky-700",
              accent === "purple" && "bg-violet-100 text-violet-700",
              accent === "default" && "bg-brand-red/10 text-brand-red"
            )}
          >
            <Icon
              className={cn(
                iconSize === "lg"
                  ? "size-7"
                  : compact
                    ? "size-3.5"
                    : "size-4"
              )}
              strokeWidth={iconSize === "lg" ? 1.65 : 2}
            />
          </span>
        ) : null}
      </div>
      <div className={cn("flex items-end gap-2", compact ? "mt-1" : "mt-2")}>
        <p
          className={cn(
            "font-semibold tabular-nums tracking-tight",
            compact ? "text-xl md:text-2xl" : "text-3xl"
          )}
        >
          {value}
        </p>
        {trend ? (
          <span className="mb-1 rounded-md bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700">
            {trend}
          </span>
        ) : null}
      </div>
      {detail ? (
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      ) : null}
    </div>
  )
}
