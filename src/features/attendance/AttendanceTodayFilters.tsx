"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CalendarDays, Building2, BriefcaseBusiness, TimerReset } from "lucide-react"

import type { BranchFilterOption } from "@/features/employees/data"
import { cn } from "@/lib/utils"

const inputClassName =
  "h-11 rounded-2xl border border-border/80 bg-background px-3 text-sm outline-none transition focus-visible:border-brand-red/40 focus-visible:ring-2 focus-visible:ring-brand-red/20"

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

  const activeTokens = [
    values.branch_id
      ? {
          label:
            branches.find((branch) => branch.id === values.branch_id)?.name ??
            (values.branch_id === "__none__" ? "รอกำหนดสาขา" : values.branch_id),
          icon: Building2,
        }
      : null,
    values.dept ? { label: values.dept, icon: BriefcaseBusiness } : null,
    values.shift_id
      ? {
          label:
            shifts.find((shift) => shift.id === values.shift_id)?.label ?? values.shift_id,
          icon: TimerReset,
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; icon: typeof CalendarDays }>

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-gradient-to-br from-background via-background to-muted/20 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 px-4 py-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Today command bar</p>
          <p className="text-xs text-muted-foreground">
            เลือกวันที่ สาขา แผนก และกะที่ต้องติดตามแบบหน้างาน
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <CalendarDays className="size-3.5" />
            วันที่ดูรายงาน {values.date}
          </span>
          {activeTokens.length === 0 ? (
            <span className="inline-flex items-center rounded-full border border-dashed border-border/80 bg-muted/15 px-3 py-1.5 text-xs text-muted-foreground">
              ทุกสาขา / ทุกแผนก / ทุกกะ
            </span>
          ) : null}
          {activeTokens.map(({ label, icon: Icon }) => (
            <span
              key={label}
              className="inline-flex items-center gap-2 rounded-full border border-brand-red/10 bg-brand-red/5 px-3 py-1.5 text-xs font-medium text-brand-red"
            >
              <Icon className="size-3.5" />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-muted-foreground">วันที่</span>
          <input
            type="date"
            className={inputClassName}
            value={values.date}
            onChange={(event) => update("date", event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-muted-foreground">สาขา</span>
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
          <span className="font-medium text-muted-foreground">แผนก</span>
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
          <span className="font-medium text-muted-foreground">กะ</span>
          <select
            className={cn(inputClassName, values.shift_id && "border-brand-red/20 bg-brand-red/5")}
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
    </div>
  )
}
