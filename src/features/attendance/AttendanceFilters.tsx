"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import type { BranchFilterOption } from "@/features/employees/data"
import { cn } from "@/lib/utils"

const inputClassName =
  "h-11 rounded-xl border border-border/80 bg-background px-3 text-sm outline-none transition focus-visible:border-brand-red/40 focus-visible:ring-2 focus-visible:ring-brand-red/20"

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

  function updateMany(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    params.delete("page")
    router.push(`${pathname}?${params.toString()}`)
  }

  function formatDateInput(date: Date): string {
    return date.toISOString().slice(0, 10)
  }

  function applyPreset(days: number) {
    const end = values.to || formatDateInput(new Date())
    const endDate = new Date(`${end}T00:00:00`)
    const startDate = new Date(endDate)
    startDate.setDate(endDate.getDate() - Math.max(days - 1, 0))
    updateMany({
      from: formatDateInput(startDate),
      to: end,
    })
  }

  function resetFilters() {
    updateMany({
      from: "",
      to: "",
      branch_id: "",
      dept: "",
      employee: "",
    })
  }

  return (
    <div
      className={cn(
        mode === "employee"
          ? "flex flex-wrap items-end gap-3 rounded-xl border border-border/70 bg-muted/15 px-3 py-3"
          : "rounded-2xl border border-border/70 bg-muted/10 p-4 shadow-sm"
      )}
    >
      <div
        className={
          mode === "employee"
            ? "contents"
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
          <span className="font-medium text-muted-foreground">จากวันที่</span>
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
          <span className="font-medium text-muted-foreground">ถึงวันที่</span>
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
              <span className="font-medium text-muted-foreground">สาขา</span>
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
              <span className="font-medium text-muted-foreground">แผนก</span>
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
              <span className="font-medium text-muted-foreground">พนักงาน</span>
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
      {mode === "full" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full border border-border/80 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-brand-red/30 hover:bg-brand-red/5 hover:text-foreground"
            onClick={() => applyPreset(1)}
          >
            วันนี้
          </button>
          <button
            type="button"
            className="rounded-full border border-border/80 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-brand-red/30 hover:bg-brand-red/5 hover:text-foreground"
            onClick={() => applyPreset(7)}
          >
            7 วัน
          </button>
          <button
            type="button"
            className="rounded-full border border-border/80 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-brand-red/30 hover:bg-brand-red/5 hover:text-foreground"
            onClick={() => applyPreset(30)}
          >
            30 วัน
          </button>
          <button
            type="button"
            className="rounded-full border border-brand-red/15 bg-brand-red/5 px-3 py-1.5 text-xs font-medium text-brand-red transition hover:border-brand-red/30 hover:bg-brand-red/10"
            onClick={resetFilters}
          >
            ล้างตัวกรอง
          </button>
        </div>
      ) : null}
    </div>
  )
}
