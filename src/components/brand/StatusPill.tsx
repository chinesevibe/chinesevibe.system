import { cn } from "@/lib/utils"

const VARIANTS = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  warning: "bg-orange-100 text-orange-800",
  info: "bg-sky-100 text-sky-800",
  neutral: "bg-muted text-muted-foreground",
} as const

export function StatusPill({
  label,
  variant = "neutral",
}: {
  label: string
  variant?: keyof typeof VARIANTS
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        VARIANTS[variant]
      )}
    >
      {label}
    </span>
  )
}
