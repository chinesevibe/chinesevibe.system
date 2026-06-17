"use client"

import { formatLineUserIdDisplay } from "@/features/employees/LineUserIdCell"
import { cn } from "@/lib/utils"

export function LineLinkBadge({
  lineUserId,
  className,
}: {
  lineUserId: string | null | undefined
  className?: string
}) {
  const { label, variant } = formatLineUserIdDisplay(lineUserId)

  if (variant === "missing") {
    return (
      <span
        className={cn(
          "inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground",
          className
        )}
        title="ยังไม่เชื่อม LINE"
      >
        ยังไม่เชื่อม
      </span>
    )
  }

  if (variant === "portal") {
    return (
      <span
        className={cn(
          "inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900",
          className
        )}
        title={label}
      >
        Portal เท่านั้น
      </span>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-900",
        className
      )}
      title={label}
    >
      เชื่อมแล้ว
    </span>
  )
}
