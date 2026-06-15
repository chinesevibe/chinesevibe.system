"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"

const VIEWS = [
  { id: "requests", label: "คำขอลา" },
  { id: "calendar", label: "ปฏิทิน" },
  { id: "report", label: "รายงาน" },
  { id: "balances", label: "ยอดคงเหลือ" },
] as const

export function LeaveViewTabs({ active }: { active: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return (
    <div className="flex flex-wrap gap-2 border-b border-border/60 pb-4">
      {VIEWS.map((view) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set("view", view.id)
        if (view.id !== "calendar" && view.id !== "report") {
          params.delete("month")
        }
        if (view.id !== "requests") {
          params.delete("status")
          params.delete("page")
        }
        return (
          <Link
            key={view.id}
            href={`${pathname}?${params.toString()}`}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active === view.id
                ? "bg-brand-red text-white shadow-sm"
                : "border border-border/80 bg-background text-foreground/80 hover:border-brand-red/30 hover:bg-brand-red/5"
            )}
          >
            {view.label}
          </Link>
        )
      })}
    </div>
  )
}
