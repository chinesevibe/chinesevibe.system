"use client"

import {
  autoSaveStatusText,
  type AutoSaveStatus,
} from "@/features/employees/use-debounced-auto-save"
import { cn } from "@/lib/utils"

export function AutoSaveIndicator({
  status,
  error,
  className,
}: {
  status: AutoSaveStatus
  error: string | null
  className?: string
}) {
  const text = error ?? autoSaveStatusText(status)
  if (!text) return null

  return (
    <p
      className={cn(
        "text-xs",
        error || status === "error"
          ? "text-destructive"
          : status === "saved"
            ? "text-emerald-600"
            : "text-muted-foreground",
        className
      )}
    >
      {text}
    </p>
  )
}
