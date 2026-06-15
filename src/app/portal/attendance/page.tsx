import { Suspense } from "react"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { AttendancePagination } from "@/features/attendance/AttendancePagination"
import { AttendanceSummaryCard } from "@/features/attendance/AttendanceSummary"
import {
  getAttendanceRecords,
  normalizeAttendanceParams,
} from "@/features/attendance/data"
import { EmployeeAttendanceTable } from "@/features/portal/EmployeeAttendanceTable"
import { getCurrentEmployee } from "@/lib/auth/session"

export default async function PortalAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const employee = await getCurrentEmployee()
  if (!employee) return null

  const raw = await searchParams
  const params = normalizeAttendanceParams({
    ...raw,
    employee: employee.id,
  })
  const { rows, total, summary } = await getAttendanceRecords(params)

  return (
    <AdminPageShell
      title="การเข้างาน"
      description="ประวัติเช็คอิน-เช็คเอาท์ของคุณ"
    >
      <div className="flex flex-col gap-4">
        <AttendanceSummaryCard summary={summary} />
        <EmployeeAttendanceTable rows={rows} />
        <Suspense>
          <AttendancePagination page={params.page} total={total} />
        </Suspense>
      </div>
    </AdminPageShell>
  )
}
