import { Suspense } from "react"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { BrandTabs } from "@/components/brand/BrandTabs"
import { AttendanceAddButton } from "@/features/attendance/AttendanceHrActions"
import { AttendanceFilters } from "@/features/attendance/AttendanceFilters"
import { AttendancePagination } from "@/features/attendance/AttendancePagination"
import { AttendanceSummaryCard } from "@/features/attendance/AttendanceSummary"
import { AttendanceTable } from "@/features/attendance/AttendanceTable"
import { AttendanceTodayFilters } from "@/features/attendance/AttendanceTodayFilters"
import { AttendanceTodayRoster } from "@/features/attendance/AttendanceTodayRoster"
import { ExportCsvButton } from "@/features/attendance/ExportCsvButton"
import {
  getAttendanceDepartments,
  getAttendanceEmployees,
  getAttendanceRecords,
  normalizeAttendanceParams,
} from "@/features/attendance/data"
import { getBranchesForFilter } from "@/features/employees/data"
import { canManageHr } from "@/lib/auth/roles"
import { getDailyRoster } from "@/lib/attendance/daily-roster"
import { ictDateFromUtc } from "@/lib/attendance/ict-datetime"
import { getCurrentEmployee } from "@/lib/auth/session"

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const rawParams = await searchParams
  const view = typeof rawParams.view === "string" && rawParams.view === "history" ? "history" : "today"
  const params = normalizeAttendanceParams(rawParams)
  const todayParams = {
    date: typeof rawParams.date === "string" && rawParams.date ? rawParams.date : ictDateFromUtc(new Date()),
    dept: typeof rawParams.dept === "string" ? rawParams.dept : "",
    branch_id: typeof rawParams.branch_id === "string" ? rawParams.branch_id : "",
    shift_id: typeof rawParams.shift_id === "string" ? rawParams.shift_id : "",
  }
  const employee = await getCurrentEmployee()
  const canManage = employee ? canManageHr(employee.role) : false

  if (view === "today") {
    const [roster, departments, branches, employees] = await Promise.all([
      getDailyRoster(todayParams),
      getAttendanceDepartments(),
      getBranchesForFilter(),
      getAttendanceEmployees(todayParams.branch_id),
    ])

    return (
      <AdminPageShell
        title="Attendance"
        description="สถานะลงเวลาวันนี้แบบแยกตามกะ พร้อมรายชื่อคนมา สาย ลา และขาด"
        action={
          canManage ? (
            <AttendanceAddButton employees={employees} defaultDate={todayParams.date} />
          ) : null
        }
      >
        <div className="flex flex-col gap-4">
          <BrandTabs
            tabs={[
              { id: "today", label: "Today roster" },
              { id: "history", label: "History" },
            ]}
            active={view}
            param="view"
            preserveParams={["date", "branch_id", "dept", "shift_id", "from", "to", "employee", "page"]}
          />
          <Suspense fallback={null}>
            <AttendanceTodayFilters
              departments={departments}
              branches={branches}
              shifts={roster.availableShifts}
              values={todayParams}
            />
          </Suspense>
          <AttendanceTodayRoster roster={roster} />
        </div>
      </AdminPageShell>
    )
  }

  const [{ rows, total, summary }, departments, branches, employees] = await Promise.all([
    getAttendanceRecords(params),
    getAttendanceDepartments(),
    getBranchesForFilter(),
    getAttendanceEmployees(params.branch_id),
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
        <BrandTabs
          tabs={[
            { id: "today", label: "Today roster" },
            { id: "history", label: "History" },
          ]}
          active={view}
          param="view"
          preserveParams={["date", "branch_id", "dept", "shift_id", "from", "to", "employee", "page"]}
        />
        <Suspense fallback={null}>
          <AttendanceFilters
            departments={departments}
            branches={branches}
            employees={employees}
            values={{
              from: params.from,
              to: params.to,
              dept: params.dept,
              employee: params.employee,
              branch_id: params.branch_id,
            }}
          />
        </Suspense>
        <AttendanceSummaryCard summary={summary} />
        <AttendanceTable rows={rows} canManage={canManage} />
        <Suspense fallback={null}>
          <AttendancePagination page={params.page} total={total} />
        </Suspense>
      </div>
    </AdminPageShell>
  )
}
