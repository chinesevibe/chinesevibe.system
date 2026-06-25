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
import { listWorkShifts } from "@/features/shifts/data"
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
  const currentParams = new URLSearchParams()
  for (const [key, value] of Object.entries(rawParams)) {
    if (typeof value === "string" && value) currentParams.set(key, value)
  }
  const currentPath = currentParams.toString()
    ? `/admin/attendance?${currentParams.toString()}`
    : "/admin/attendance"
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
        title="การเข้างาน"
        description="ข้อมูลพนักงานที่กำลังทำงาน พร้อมรายชื่อคนมา สาย ลา และขาด"
        action={
          canManage ? (
            <AttendanceAddButton employees={employees} defaultDate={todayParams.date} />
          ) : null
        }
      >
        <div className="flex flex-col gap-4">
          <BrandTabs
            tabs={[
              { id: "today", label: "วันนี้" },
              { id: "history", label: "ประวัติ" },
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
          <div className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-4 py-3">
              <p className="text-sm font-semibold text-foreground">ข้อมูลพนักงานที่กำลังทำงาน</p>
              <div className="rounded-full border border-brand-red/15 bg-brand-red/5 px-3 py-1 text-xs font-medium text-brand-red">
                วันที่ {todayParams.date}
              </div>
            </div>
            <div className="p-4">
              <AttendanceTodayRoster roster={roster} returnTo={currentPath} />
            </div>
          </div>
        </div>
      </AdminPageShell>
    )
  }

  const [{ rows, total, summary }, departments, branches, employees, workShifts] = await Promise.all([
    getAttendanceRecords(params),
    getAttendanceDepartments(),
    getBranchesForFilter(),
    getAttendanceEmployees(params.branch_id),
    listWorkShifts(),
  ])
  const pendingReviewCount = rows.filter((row) => row.locationReviewStatus === "pending_hr").length
  const flaggedCount = rows.filter(
    (row) =>
      row.status === "late" ||
      row.status === "in_progress" ||
      row.locationReviewStatus === "pending_hr" ||
      row.locationReviewStatus === "rejected"
  ).length

  return (
    <AdminPageShell
      fill
      title="การเข้างาน"
      description="ประวัติเช็คอิน-เช็คเอาท์และสรุปชั่วโมงทำงาน — HR สามารถแก้ไขเวลาและบันทึกเพิ่มเองได้"
      action={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          {canManage ? (
            <AttendanceAddButton employees={employees} defaultDate={params.to} />
          ) : null}
          <ExportCsvButton rows={rows} />
        </div>
      }
    >
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
        <BrandTabs
          tabs={[
            { id: "today", label: "วันนี้" },
            { id: "history", label: "ประวัติ" },
          ]}
          active={view}
          param="view"
          preserveParams={["date", "branch_id", "dept", "shift_id", "from", "to", "employee", "page"]}
        />
        <AttendanceSummaryCard
          summary={summary}
          pendingReviewCount={pendingReviewCount}
          flaggedCount={flaggedCount}
          strip
        />
        <Suspense fallback={null}>
          <AttendanceFilters
            departments={departments}
            branches={branches}
            employees={employees}
            shifts={workShifts}
            values={{
              from: params.from,
              to: params.to,
              dept: params.dept,
              employee: params.employee,
              branch_id: params.branch_id,
              shift_id: params.shift_id,
              status: params.status,
            }}
          />
        </Suspense>
        <div className="min-h-0 flex-1 overflow-hidden">
          <AttendanceTable rows={rows} canManage={canManage} returnTo={currentPath} />
        </div>
        <Suspense fallback={null}>
          <AttendancePagination page={params.page} total={total} />
        </Suspense>
      </div>
    </AdminPageShell>
  )
}
