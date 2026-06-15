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
import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = normalizeAttendanceParams(await searchParams)
  const employee = await getCurrentEmployee()
  const canManage = employee ? canManageHr(employee.role) : false

  const [{ rows, total, summary }, departments, employees] = await Promise.all([
    getAttendanceRecords(params),
    getAttendanceDepartments(),
    getAttendanceEmployees(),
  ])

  return (
    <AdminPageShell
      title="Attendance"
      description="ประวัติเช็คอิน-เช็คเอาท์และสรุปชั่วโมงทำงาน — HR สามารถแก้ไขเวลาและบันทึกเพิ่มเองได้"
      action={
        <div className="flex flex-wrap items-center gap-2">
          {canManage ? (
            <AttendanceAddButton employees={employees} defaultDate={params.to} />
          ) : null}
          <ExportCsvButton rows={rows} />
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <AttendanceFilters
          departments={departments}
          employees={employees}
          values={{
            from: params.from,
            to: params.to,
            dept: params.dept,
            employee: params.employee,
          }}
        />
        <AttendanceSummaryCard summary={summary} />
        <AttendanceTable rows={rows} canManage={canManage} />
        <AttendancePagination page={params.page} total={total} />
      </div>
    </AdminPageShell>
  )
}
