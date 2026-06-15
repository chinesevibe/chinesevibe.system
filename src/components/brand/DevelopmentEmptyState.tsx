import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export function DevelopmentEmptyState({
  icon: Icon,
  title,
  description = "อยู่ในช่วงพัฒนาปรับปรุงระบบ — ข้อมูลจะแสดงเมื่อมีการใช้งานจริง",
  compact = false,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  compact?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-4 text-center",
        compact ? "py-6" : "h-full min-h-[10rem] py-8",
        className
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red",
          compact ? "size-14" : "size-16"
        )}
      >
        <Icon className={compact ? "size-8" : "size-9"} strokeWidth={1.5} />
      </span>
      <div className="max-w-xs">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
