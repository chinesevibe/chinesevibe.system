"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import type { BranchFilterOption } from "@/features/employees/data"

const inputClassName =
  "h-9 rounded-lg border border-border/80 bg-muted/30 px-3 text-sm outline-none focus-visible:border-brand-red/40 focus-visible:ring-2 focus-visible:ring-brand-red/20"

export function AttendanceTodayFilters({
  departments,
  branches,
  shifts,
  values,
}: {
  departments: string[]
  branches: BranchFilterOption[]
  shifts: Array<{ id: string; label: string }>
  values: {
    date: string
    branch_id: string
    dept: string
    shift_id: string
  }
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.set("view", "today")
    params.delete("page")
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/15 p-3 sm:grid-cols-2 xl:grid-cols-4">
      <label className="flex flex-col gap-1 text-sm">
        วันที่
        <input
          type="date"
          className={inputClassName}
          value={values.date}
          onChange={(event) => update("date", event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        สาขา
        <select
          className={inputClassName}
          value={values.branch_id}
          onChange={(event) => update("branch_id", event.target.value)}
        >
          <option value="">ทุกสาขา</option>
          <option value="__none__">รอกำหนดสาขา</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        แผนก
        <select
          className={inputClassName}
          value={values.dept}
          onChange={(event) => update("dept", event.target.value)}
        >
          <option value="">ทั้งหมด</option>
          {departments.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        กะ
        <select
          className={inputClassName}
          value={values.shift_id}
          onChange={(event) => update("shift_id", event.target.value)}
        >
          <option value="">ทุกกะ</option>
          {shifts.map((shift) => (
            <option key={shift.id} value={shift.id}>
              {shift.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
