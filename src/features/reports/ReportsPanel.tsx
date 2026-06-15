"use client"

import Link from "next/link"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ReportsPanel({
  departments,
  days,
  department,
}: {
  departments: string[]
  days: number
  department: string
}) {
  function exportUrl(type: string) {
    const params = new URLSearchParams({ type, days: String(days) })
    if (department) params.set("department", department)
    return `/api/reports/export?${params.toString()}`
  }

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border p-4">
      <form className="flex flex-wrap items-end gap-3" method="get">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">ช่วงเวลา</span>
          <select
            name="days"
            defaultValue={String(days)}
            className="h-9 rounded-lg border px-2"
          >
            <option value="30">30 วัน</option>
            <option value="60">60 วัน</option>
            <option value="90">90 วัน</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">แผนก</span>
          <select
            name="department"
            defaultValue={department}
            className="h-9 rounded-lg border px-2"
          >
            <option value="">ทุกแผนก</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" size="sm" variant="secondary">
          ใช้ตัวกรอง
        </Button>
      </form>
      <div className="flex flex-wrap gap-2">
        <Link
          href={exportUrl("attendance")}
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        >
          CSV เข้างาน
        </Link>
        <Link
          href={exportUrl("leave")}
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        >
          CSV ลา
        </Link>
        <Link
          href={exportUrl("overtime")}
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        >
          CSV OT
        </Link>
      </div>
    </div>
  )
}
