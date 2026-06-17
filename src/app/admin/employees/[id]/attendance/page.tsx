import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { AttendanceAddButton } from "@/features/attendance/AttendanceHrActions"
import { AttendanceCalendar } from "@/features/attendance/AttendanceCalendar"
import { AttendanceFilters } from "@/features/attendance/AttendanceFilters"
import { AttendancePagination } from "@/features/attendance/AttendancePagination"
import { AttendanceSummaryCard } from "@/features/attendance/AttendanceSummary"
import { AttendanceTable } from "@/features/attendance/AttendanceTable"
import { ExportCsvButton } from "@/features/attendance/ExportCsvButton"
import { getEmployeeAttendanceCalendar } from "@/features/attendance/calendar"
import {
  getAttendanceDepartments,
  getAttendanceEmployees,
  getAttendanceRecords,
  normalizeAttendanceParams,
} from "@/features/attendance/data"
import { getEmployeeProfile } from "@/features/employees/profile/data"
import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"

function currentMonth(): string {
  const shifted = new Date(Date.now() + 7 * 60 * 60 * 1000)
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`
}

export default async function EmployeeAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { id } = await params
  const rawParams = await searchParams
  const [profile, caller] = await Promise.all([
    getEmployeeProfile(id).catch(() => null),
    getCurrentEmployee(),
  ])

  if (!profile) notFound()

  const month =
    typeof rawParams.month === "string" && /^\d{4}-\d{2}$/.test(rawParams.month)
      ? rawParams.month
      : currentMonth()
  const highlightDate =
    typeof rawParams.date === "string" ? rawParams.date : null

  const listParams = normalizeAttendanceParams({
    ...rawParams,
    employee: id,
  })
  const canManage = caller ? canManageHr(caller.role) : false
  const now = new Date()

  const [{ rows, total, summary }, departments, employees, calendar] =
    await Promise.all([
      getAttendanceRecords(listParams),
      getAttendanceDepartments(),
      getAttendanceEmployees(),
      getEmployeeAttendanceCalendar(id, month, now),
    ])

  const employeeCode =
    profile.employee_code?.trim() || profile.id.slice(0, 8).toUpperCase()
  const basePath = `/admin/employees/${profile.id}/attendance`

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <p className="shrink-0 text-sm">
        <Link
          href={`/admin/employees/${profile.id}`}
          className="text-brand-red hover:underline"
        >
          ← กลับโปรไฟล์ {profile.name}
        </Link>
      </p>
      <AdminPageShell
        fill
        title="ประวัติการเข้างาน"
        description={`${profile.name} · ${employeeCode}${profile.department ? ` · ${profile.department}` : ""}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {canManage ? (
              <AttendanceAddButton
                employees={employees}
                defaultDate={highlightDate ?? listParams.to}
              />
            ) : null}
            <ExportCsvButton rows={rows} />
          </div>
        }
      >
        <div className="grid h-full min-h-0 gap-4 overflow-hidden lg:grid-cols-[minmax(280px,36%)_minmax(0,1fr)]">
          <div className="min-h-0 overflow-y-auto border-border/60 lg:border-r lg:pr-4">
            <AttendanceCalendar
              month={month}
              days={calendar.days}
              basePath={basePath}
              selectedDate={highlightDate}
              compact
            />
          </div>

          <div className="flex min-h-0 flex-col gap-2.5 overflow-hidden lg:gap-3">
            <Suspense fallback={null}>
              <AttendanceFilters
                mode="employee"
                departments={departments}
                employees={employees}
                values={{
                  from: listParams.from,
                  to: listParams.to,
                  dept: listParams.dept,
                  employee: id,
                  branch_id: listParams.branch_id,
                }}
              />
            </Suspense>
            <AttendanceSummaryCard summary={summary} compact />
            <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border/60 bg-muted/10">
              <AttendanceTable
                rows={rows}
                canManage={canManage}
                employeeView
              />
            </div>
            <Suspense fallback={null}>
              <AttendancePagination page={listParams.page} total={total} />
            </Suspense>
          </div>
        </div>
      </AdminPageShell>
    </div>
  )
}
