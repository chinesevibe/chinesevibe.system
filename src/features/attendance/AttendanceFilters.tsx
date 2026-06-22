"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CalendarRange, FilterX, Search, Siren } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { BranchFilterOption } from "@/features/employees/data"
import type { WorkShiftSummary } from "@/features/shifts/types"
import { formatShiftTimeRange } from "@/features/shifts/format"
import { cn } from "@/lib/utils"

const inputClassName =
  "h-11 rounded-xl border border-border/80 bg-background px-3 text-sm outline-none transition focus-visible:border-brand-red/40 focus-visible:ring-2 focus-visible:ring-brand-red/20"

export function AttendanceFilters({
  departments,
  branches = [],
  employees,
  shifts = [],
  values,
  mode = "full",
}: {
  departments: string[]
  branches?: BranchFilterOption[]
  employees: Array<{ id: string; name: string; employeeCode: string }>
  shifts?: WorkShiftSummary[]
  values: {
    from: string
    to: string
    dept: string
    employee: string
    branch_id: string
    shift_id: string
    status: string
  }
  /** employee: date range only (single-employee attendance page) */
  mode?: "full" | "employee"
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const employeeInputTimerRef = useRef<number | null>(null)
  const hasFilters = Boolean(
    values.branch_id ||
      values.dept ||
      values.employee ||
      values.shift_id ||
      values.status
  )

  useEffect(() => {
    return () => {
      if (employeeInputTimerRef.current != null) {
        window.clearTimeout(employeeInputTimerRef.current)
      }
    }
  }, [])

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete("page")
    router.replace(`${pathname}?${params.toString()}`)
  }

  function updateMany(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    params.delete("page")
    router.replace(`${pathname}?${params.toString()}`)
  }

  function handleEmployeeInputChange(value: string) {
    if (employeeInputTimerRef.current != null) {
      window.clearTimeout(employeeInputTimerRef.current)
    }
    employeeInputTimerRef.current = window.setTimeout(() => {
      update("employee", value)
    }, 300)
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
      shift_id: "",
      status: "",
    })
  }

  return (
    <div
      className={cn(
        mode === "employee"
          ? "flex flex-wrap items-end gap-3 rounded-2xl border border-border/70 bg-muted/15 px-3 py-3"
          : "overflow-hidden rounded-[1.75rem] border border-border/70 bg-gradient-to-br from-background via-background to-muted/15 shadow-sm"
      )}
    >
      {mode === "full" ? (
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 px-4 py-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">History command bar</p>
            <p className="text-xs text-muted-foreground">
              กรองช่วงเวลา พนักงาน กะ และเคสผิดปกติก่อนลงดู ledger ย้อนหลัง
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1.5 font-medium text-muted-foreground">
              <CalendarRange className="size-3.5" />
              ช่วงวันที่ {values.from} ถึง {values.to}
            </span>
            {values.employee ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-red/15 bg-brand-red/5 px-3 py-1.5 font-medium text-brand-red">
                <Search className="size-3.5" />
                ค้นหา {values.employee}
              </span>
            ) : null}
            {values.status ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 font-medium text-amber-800">
                <Siren className="size-3.5" />
                โฟกัสเคสผิดปกติ
              </span>
            ) : values.branch_id ? (
              <span className="rounded-full border border-border/70 bg-background px-3 py-1.5 font-medium text-muted-foreground">
                สาขาถูกกรองแล้ว
              </span>
            ) : null}
            {hasFilters ? (
              <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                <FilterX className="size-3.5" />
                ล้างตัวกรอง
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div
        className={
          mode === "employee"
            ? "contents"
            : "grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
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
              <span className="font-medium text-muted-foreground">กะงาน</span>
              <select
                className={inputClassName}
                value={values.shift_id}
                onChange={(e) => update("shift_id", e.target.value)}
              >
                <option value="">ทุกกะ</option>
                <option value="__none__">ยังไม่กำหนดกะ</option>
                {shifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {`${shift.name} (${formatShiftTimeRange(shift)})`}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-muted-foreground">พนักงาน / รหัสพนักงาน</span>
              <input
                key={values.employee}
                list="attendance-employee-options"
                className={inputClassName}
                defaultValue={values.employee}
                onChange={(e) => handleEmployeeInputChange(e.target.value)}
                placeholder="พิมพ์ชื่อหรือรหัสพนักงาน"
              />
              <datalist id="attendance-employee-options">
                {employees.map((employee) => (
                  <option
                    key={employee.id}
                    value={employee.employeeCode}
                    label={`${employee.name} (${employee.employeeCode})`}
                  />
                ))}
              </datalist>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-muted-foreground">สถานะที่ต้องโฟกัส</span>
              <select
                className={inputClassName}
                value={values.status}
                onChange={(e) => update("status", e.target.value)}
              >
                <option value="">ทุกสถานะ</option>
                <option value="late">มาสาย</option>
                <option value="open">ยังไม่เช็คออก / incomplete</option>
                <option value="location_review">รอ HR ตรวจพิกัด</option>
              </select>
            </label>
          </>
        ) : null}
      </div>
      {mode === "full" ? (
        <div className="flex flex-wrap gap-2 border-t border-border/60 px-4 pb-4 pt-1">
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
          {hasFilters ? (
            <button
              type="button"
              className="rounded-full border border-brand-red/15 bg-brand-red/5 px-3 py-1.5 text-xs font-medium text-brand-red transition hover:border-brand-red/30 hover:bg-brand-red/10"
              onClick={resetFilters}
            >
              ล้างตัวกรอง
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
