"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import type { LeaveStatusFilter } from "@/features/leaves/types"

const inputClassName =
  "h-9 rounded-lg border border-border/80 bg-muted/30 px-3 text-sm outline-none focus-visible:border-brand-red/40 focus-visible:ring-2 focus-visible:ring-brand-red/20"

const OPTIONS: Array<{ value: LeaveStatusFilter; label: string }> = [
  { value: "all", label: "ทั้งหมด" },
  { value: "pending", label: "รออนุมัติ" },
  { value: "approved", label: "อนุมัติแล้ว" },
  { value: "rejected", label: "ไม่อนุมัติ" },
]

export function LeaveFilters({ status }: { status: LeaveStatusFilter }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function update(next: LeaveStatusFilter) {
    const params = new URLSearchParams(searchParams.toString())
    if (next === "all") params.delete("status")
    else params.set("status", next)
    params.delete("page")
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <label className="flex flex-col gap-1 text-sm">
      สถานะ
      <select
        className={inputClassName}
        value={status}
        onChange={(e) => update(e.target.value as LeaveStatusFilter)}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
