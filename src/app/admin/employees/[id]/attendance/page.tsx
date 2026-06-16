import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { AttendanceAddButton } from "@/features/attendance/AttendanceHrActions"
import { AttendanceFilters } from "@/features/attendance/AttendanceFilters"
import { AttendancePagination } from "@/features/attendance/AttendancePagination"
import { AttendanceSummaryCard } from "@/features/attendance/AttendanceSummary"
import { AttendanceTable } from "@/features/attendance/AttendanceTable"
import { ExportCsvButton } from "@/features/attendance/ExportCsvButton"
import {
  getAttendanceDepartments,
  getAttendanceEmployees,
  getAttendanceRecords,
  normalizeAttendanceParams,
} from "@/features/attendance/data"
import { getEmployeeProfile } from "@/features/employees/profile/data"
import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"

export default async function EmployeeAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { id } = await params
  const [profile, caller, rawParams] = await Promise.all([
    getEmployeeProfile(id).catch(() => null),
    getCurrentEmployee(),
    searchParams,
  ])

  if (!profile) notFound()

  const listParams = normalizeAttendanceParams({
    ...(await rawParams),
    employee: id,
  })
  const canManage = caller ? canManageHr(caller.role) : false

  const [{ rows, total, summary }, departments, employees] = await Promise.all([
    getAttendanceRecords(listParams),
    getAttendanceDepartments(),
    getAttendanceEmployees(),
  ])

  const employeeCode =
    profile.employee_code?.trim() || profile.id.slice(0, 8).toUpperCase()

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
              <AttendanceAddButton employees={employees} defaultDate={listParams.to} />
            ) : null}
            <ExportCsvButton rows={rows} />
          </div>
        }
      >
        <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
          <Suspense fallback={null}>
            <AttendanceFilters
              departments={departments}
              employees={employees}
              values={{
                from: listParams.from,
                to: listParams.to,
                dept: listParams.dept,
                employee: id,
              }}
            />
          </Suspense>
          <AttendanceSummaryCard summary={summary} />
          <div className="min-h-0 flex-1 overflow-auto">
            <AttendanceTable rows={rows} canManage={canManage} />
          </div>
          <Suspense fallback={null}>
            <AttendancePagination page={listParams.page} total={total} />
          </Suspense>
        </div>
      </AdminPageShell>
    </div>
  )
}
