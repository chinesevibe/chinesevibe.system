import { Suspense } from "react"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { AttendancePagination } from "@/features/attendance/AttendancePagination"
import { AttendanceSummaryCard } from "@/features/attendance/AttendanceSummary"
import {
  AttendanceCalendar,
  AttendanceCorrectableBanner,
  RetroQuotaBadge,
} from "@/features/attendance/AttendanceCalendar"
import {
  getCorrectableDays,
  getEmployeeAttendanceCalendar,
} from "@/features/attendance/calendar"
import {
  getAttendanceRecords,
  normalizeAttendanceParams,
} from "@/features/attendance/data"
import { EmployeeAttendanceTable } from "@/features/portal/EmployeeAttendanceTable"
import { getRetroUsage } from "@/lib/attendance/retro-limit"
import { getCurrentEmployee } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

function currentMonth(now = new Date()): string {
  const shifted = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`
}

export default async function PortalAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const employee = await getCurrentEmployee()
  if (!employee) return null

  const raw = await searchParams
  const month =
    typeof raw.month === "string" && /^\d{4}-\d{2}$/.test(raw.month)
      ? raw.month
      : currentMonth()

  const params = normalizeAttendanceParams({
    ...raw,
    employee: employee.id,
  })

  const supabase = await createClient()
  const now = new Date()

  const [{ rows, total, summary }, calendar, correctable, retroUsage] =
    await Promise.all([
      getAttendanceRecords(params),
      getEmployeeAttendanceCalendar(employee.id, month, now),
      getCorrectableDays(employee.id, now),
      getRetroUsage(supabase, employee.id, now),
    ])

  return (
    <AdminPageShell
      title="การเข้างาน"
      description="ปฏิทินและประวัติเช็คอิน-เช็คเอาท์ของคุณ"
    >
      <div className="flex flex-col gap-4">
        <RetroQuotaBadge used={retroUsage.used} limit={retroUsage.limit} />
        <AttendanceCorrectableBanner items={correctable} />

        <div className="grid gap-4 lg:grid-cols-[minmax(280px,38%)_minmax(0,1fr)] lg:items-start lg:gap-4">
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto">
            <AttendanceCalendar
              month={month}
              days={calendar.days}
              basePath="/portal/attendance"
              compact
            />
          </div>

          <div className="flex min-h-0 flex-col gap-4">
            <AttendanceSummaryCard summary={summary} compact />
            <div className="overflow-auto rounded-xl border border-border/80 bg-card shadow-sm">
              <EmployeeAttendanceTable rows={rows} />
            </div>
            <Suspense>
              <AttendancePagination page={params.page} total={total} />
            </Suspense>
          </div>
        </div>
      </div>
    </AdminPageShell>
  )
}
