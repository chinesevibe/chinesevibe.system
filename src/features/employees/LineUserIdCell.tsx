import { isPortalLineId, isRealLineId } from "@/lib/auth/line-user-id"
import { cn } from "@/lib/utils"

export function formatLineUserIdDisplay(lineUserId: string | null | undefined): {
  label: string
  variant: "real" | "portal" | "missing"
} {
  if (!lineUserId?.trim()) {
    return { label: "—", variant: "missing" }
  }
  if (isRealLineId(lineUserId)) {
    return { label: lineUserId, variant: "real" }
  }
  if (isPortalLineId(lineUserId)) {
    return { label: lineUserId, variant: "portal" }
  }
  return { label: lineUserId, variant: "portal" }
}

export function LineUserIdCell({
  lineUserId,
  className,
}: {
  lineUserId: string | null | undefined
  className?: string
}) {
  const { label, variant } = formatLineUserIdDisplay(lineUserId)

  if (variant === "missing") {
    return <span className={cn("text-sm text-muted-foreground", className)}>—</span>
  }

  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <code
        className="block max-w-[220px] truncate text-xs text-foreground"
        title={label}
      >
        {label}
      </code>
      {variant === "portal" ? (
        <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900">
          ยังไม่ผูก LINE จริง
        </span>
      ) : (
        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-900">
          LINE OK
        </span>
      )}
    </div>
  )
}
