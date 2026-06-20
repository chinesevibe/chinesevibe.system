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
        title="Attendance"
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
          <div className="rounded-[2rem] border border-border/70 bg-gradient-to-br from-background via-background to-muted/15 p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">ข้อมูลพนักงานที่กำลังทำงาน</p>
                <p className="text-xs text-muted-foreground">
                  ระบบจะอัปเดตบอร์ดตามเวลาจริง เพื่อให้รายชื่อย้ายตามช่วงเวลาใน kanban
                </p>
              </div>
              <div className="rounded-full border border-brand-red/15 bg-brand-red/5 px-3 py-1.5 text-xs font-medium text-brand-red">
                วันที่ {todayParams.date}
              </div>
            </div>
            <AttendanceTodayRoster roster={roster} returnTo={currentPath} />
          </div>
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
        <div className="rounded-[2rem] border border-border/70 bg-gradient-to-br from-background via-background to-muted/15 p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">History audit ledger</p>
              <p className="text-xs text-muted-foreground">
                เริ่มจากช่วงเวลาและ anomaly ก่อน แล้วค่อยไล่ตรวจรายการละเอียดด้านล่าง
              </p>
            </div>
            <div className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground">
              รวม {total} รายการ
            </div>
          </div>
          <AttendanceSummaryCard summary={summary} />
          <div className="mt-4">
            <AttendanceTable rows={rows} canManage={canManage} returnTo={currentPath} />
          </div>
        </div>
        <Suspense fallback={null}>
          <AttendancePagination page={params.page} total={total} />
        </Suspense>
      </div>
    </AdminPageShell>
  )
}
