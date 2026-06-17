"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import type { BranchFilterOption } from "@/features/employees/data"

const inputClassName =
  "h-9 rounded-lg border border-border/80 bg-muted/30 px-3 text-sm outline-none focus-visible:border-brand-red/40 focus-visible:ring-2 focus-visible:ring-brand-red/20"

export function AttendanceFilters({
  departments,
  branches = [],
  employees,
  values,
  mode = "full",
}: {
  departments: string[]
  branches?: BranchFilterOption[]
  employees: Array<{ id: string; name: string }>
  values: {
    from: string
    to: string
    dept: string
    employee: string
    branch_id: string
  }
  /** employee: date range only (single-employee attendance page) */
  mode?: "full" | "employee"
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete("page")
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div
      className={
        mode === "employee"
          ? "flex flex-wrap items-end gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5"
          : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      }
    >
      <label
        className={
          mode === "employee"
            ? "flex min-w-[9rem] flex-1 flex-col gap-1 text-xs sm:max-w-[11rem]"
            : "flex flex-col gap-1 text-sm"
        }
      >
        จากวันที่
        <input
          type="date"
          className={inputClassName}
          value={values.from}
          onChange={(e) => update("from", e.target.value)}
        />
      </label>
      <label
        className={
          mode === "employee"
            ? "flex min-w-[9rem] flex-1 flex-col gap-1 text-xs sm:max-w-[11rem]"
            : "flex flex-col gap-1 text-sm"
        }
      >
        ถึงวันที่
        <input
          type="date"
          className={inputClassName}
          value={values.to}
          onChange={(e) => update("to", e.target.value)}
        />
      </label>
      {mode === "full" ? (
        <>
          <label className="flex flex-col gap-1 text-sm">
            สาขา
            <select
              className={inputClassName}
              value={values.branch_id}
              onChange={(e) => update("branch_id", e.target.value)}
            >
              <option value="">ทุกสาขา</option>
              <option value="__none__">รอกำหนดสาขา</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            แผนก
            <select
              className={inputClassName}
              value={values.dept}
              onChange={(e) => update("dept", e.target.value)}
            >
              <option value="">ทั้งหมด</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            พนักงาน
            <select
              className={inputClassName}
              value={values.employee}
              onChange={(e) => update("employee", e.target.value)}
            >
              <option value="">ทั้งหมด</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}
    </div>
  )
}
