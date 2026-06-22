"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { FilterX, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { BranchFilterOption } from "@/features/employees/data"
import { formatShiftTimeRange } from "@/features/shifts/format"
import type { WorkShiftSummary } from "@/features/shifts/types"
import { cn } from "@/lib/utils"

const inputClass =
  "h-10 rounded-xl border border-border/80 bg-background px-3 text-sm outline-none transition focus-visible:border-brand-red/40 focus-visible:ring-2 focus-visible:ring-brand-red/20"

export function EmployeeFilters({
  departments,
  branches,
  workShifts,
}: {
  departments: string[]
  branches: BranchFilterOption[]
  workShifts: WorkShiftSummary[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [q, setQ] = useState(searchParams.get("q") ?? "")
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const branchId = searchParams.get("branch_id") ?? ""
  const department = searchParams.get("dept") ?? ""
  const shiftId = searchParams.get("work_shift_id") ?? searchParams.get("shift_id") ?? ""
  const status = searchParams.get("status") ?? ""
  const sortValue = `${searchParams.get("sort") ?? "name"}:${searchParams.get("dir") ?? "asc"}`
  const hasFilters = Boolean(q.trim() || branchId || department || shiftId || status)
  const selectedBranch =
    branchId === "__none__" ? "รอกำหนดสาขา" : branches.find((branch) => branch.id === branchId)?.name
  const selectedShift =
    shiftId === "__none__" ? "ยังไม่กำหนดกะ" : workShifts.find((shift) => shift.id === shiftId)?.name
  const selectedStatus =
    {
      active: "Active",
      probation: "Probation",
      inactive: "Inactive",
      onboarding: "รออนุมัติ / กำหนดสาขา",
    }[status] ?? null
  const activeFilters = [
    q.trim() ? `ค้นหา: ${q.trim()}` : null,
    selectedStatus ? `สถานะ: ${selectedStatus}` : null,
    selectedBranch ? `สาขา: ${selectedBranch}` : null,
    department ? `แผนก: ${department}` : null,
    selectedShift ? `กะ: ${selectedShift}` : null,
  ].filter(Boolean) as string[]

  function push(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    params.delete("page")
    router.replace(`${pathname}?${params.toString()}`)
  }

  useEffect(() => {
    if (q === (searchParams.get("q") ?? "")) return
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => push({ q }), 300)
    return () => {
      if (debounce.current) clearTimeout(debounce.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  function resetFilters() {
    setQ("")
    router.replace(pathname)
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-border/70 bg-gradient-to-br from-background via-background to-muted/15 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-4 py-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">ค้นหาและกรองรายชื่อพนักงาน</p>
          <p className="text-xs text-muted-foreground">
            เริ่มจากชื่อหรือรหัสพนักงาน แล้วค่อยจำกัดตามสถานะ สาขา แผนก และกะงาน
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-border/70 bg-background px-3 py-1.5 font-medium text-muted-foreground">
            {hasFilters ? "กำลังกรองผลลัพธ์" : "แสดงพนักงานทั้งหมด"}
          </span>
          {hasFilters ? (
            <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
              <FilterX className="size-3.5" />
              ล้างตัวกรอง
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 border-b border-border/60 p-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)] lg:items-end">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-muted-foreground">ค้นหาพนักงาน</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="ชื่อ หรือรหัสพนักงาน"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={cn(inputClass, "w-full pl-9")}
              aria-label="ค้นหาชื่อหรือรหัสพนักงาน"
            />
          </div>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-muted-foreground">เรียงลำดับ</span>
          <select
            value={sortValue}
            onChange={(e) => {
              const [sort, dir] = e.target.value.split(":")
              push({ sort, dir })
            }}
            className={cn(inputClass, "w-full")}
            aria-label="เรียงลำดับ"
          >
            <option value="name:asc">ชื่อ (ก→ฮ)</option>
            <option value="name:desc">ชื่อ (ฮ→ก)</option>
            <option value="contract_start:asc">วันเริ่มงาน (เก่า→ใหม่)</option>
            <option value="contract_start:desc">วันเริ่มงาน (ใหม่→เก่า)</option>
          </select>
        </label>
      </div>

      {activeFilters.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3">
          {activeFilters.map((filter) => (
            <span
              key={filter}
              className="rounded-full bg-brand-red/10 px-3 py-1 text-xs font-medium text-brand-red"
            >
              {filter}
            </span>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-muted-foreground">สถานะ</span>
          <select
            value={status}
            onChange={(e) => push({ status: e.target.value })}
            className={inputClass}
            aria-label="กรองตามสถานะ"
          >
            <option value="">ทุกสถานะ</option>
            <option value="active">Active</option>
            <option value="probation">Probation</option>
            <option value="inactive">Inactive</option>
            <option value="onboarding">รออนุมัติ / กำหนดสาขา</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-muted-foreground">สาขา</span>
          <select
            value={branchId}
            onChange={(e) => push({ branch_id: e.target.value })}
            className={cn(inputClass, "w-full")}
            aria-label="กรองตามสาขา"
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
            value={department}
            onChange={(e) => push({ dept: e.target.value })}
            className={cn(inputClass, "w-full")}
            aria-label="กรองตามแผนก"
          >
            <option value="">ทุกแผนก</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-muted-foreground">กะงาน</span>
          <select
            value={shiftId}
            onChange={(e) => push({ work_shift_id: e.target.value, shift_id: "" })}
            className={cn(inputClass, "w-full")}
            aria-label="กรองตามกะ"
          >
            <option value="">ทุกกะ</option>
            <option value="__none__">ยังไม่กำหนดกะ</option>
            {workShifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {`${shift.name} (${formatShiftTimeRange(shift)})`}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
