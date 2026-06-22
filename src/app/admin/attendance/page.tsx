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
import { CircleAlert, Clock3, MapPinned, Search } from "lucide-react"

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

  const [{ rows, total, summary }, departments, branches, employees, workShifts] = await Promise.all([
    getAttendanceRecords(params),
    getAttendanceDepartments(),
    getBranchesForFilter(),
    getAttendanceEmployees(params.branch_id),
    listWorkShifts(),
  ])
  const pendingReviewCount = rows.filter((row) => row.locationReviewStatus === "pending_hr").length
  const rejectedReviewCount = rows.filter((row) => row.locationReviewStatus === "rejected").length
  const overnightCount = rows.filter((row) => row.shiftCrossesMidnight).length
  const flaggedCount = rows.filter(
    (row) =>
      row.status === "late" ||
      row.status === "in_progress" ||
      row.locationReviewStatus === "pending_hr" ||
      row.locationReviewStatus === "rejected"
  ).length

  return (
    <AdminPageShell
      title="Attendance"
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
        <section className="rounded-[2rem] border border-border/70 bg-gradient-to-br from-background via-background to-muted/15 p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-foreground">จุดที่ HR ต้องติดตามก่อน</p>
              <p className="break-words text-xs text-muted-foreground">
                หน้านี้ใช้ตรวจรายการที่มีการบันทึกเวลาแล้ว เช่น มาสาย, ยังไม่เช็คออก, และเคสพิกัดผิดปกติ
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] sm:text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-medium text-amber-800 sm:gap-2 sm:px-3 sm:py-1.5">
                <CircleAlert className="size-3.5" />
                มาสาย {summary.lateCount}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 font-medium text-sky-700 sm:gap-2 sm:px-3 sm:py-1.5">
                <Clock3 className="size-3.5" />
                ยังไม่เช็คออก {summary.inProgressCount}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 font-medium text-rose-700 sm:gap-2 sm:px-3 sm:py-1.5">
                <MapPinned className="size-3.5" />
                รอตรวจพิกัด {pendingReviewCount}
              </span>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-4">
              <p className="text-xs font-medium text-amber-800">มาสาย</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{summary.lateCount}</p>
              <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
                ใช้เพื่อตามดูเหตุผลและเปิดประวัติพนักงานในตารางด้านล่าง
              </p>
            </div>
            <div className="rounded-xl border border-sky-200/80 bg-sky-50/60 p-4">
              <p className="text-xs font-medium text-sky-800">ยังไม่เช็คออก</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{summary.inProgressCount}</p>
              <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
                เคสนี้สะท้อนรอบงานที่บันทึกเวลาเข้าแล้ว แต่ยังไม่มีเวลาออก
              </p>
            </div>
            <div className="rounded-xl border border-rose-200/80 bg-rose-50/60 p-4">
              <p className="text-xs font-medium text-rose-700">พิกัดต้องตรวจ</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{pendingReviewCount}</p>
              <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
                นับจากรายการที่แสดงอยู่ตอนนี้ และควรเปิดรายละเอียดพนักงานเมื่อเคสต้องไล่ย้อนหลัง
              </p>
            </div>
            <div className="rounded-xl border border-violet-200/80 bg-violet-50/60 p-4">
              <p className="text-xs font-medium text-violet-700">เคสที่ควรเปิดประวัติ</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{flaggedCount}</p>
              <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
                ในหน้าปัจจุบันมีพิกัดถูกปฏิเสธ {rejectedReviewCount} รายการ และกะข้ามวัน {overnightCount} รายการ
              </p>
            </div>
          </div>
          <p className="mt-4 break-words rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            มุมมองนี้ตรวจเฉพาะรายการที่มีบันทึกเวลาแล้ว ยังไม่รวม no-show, ขาดงาน, หรือ missing check-in ที่ต้องอาศัยข้อมูล roster/ตารางกะ
          </p>
          <div className="mt-4">
            <AttendanceSummaryCard
              summary={summary}
              pendingReviewCount={pendingReviewCount}
              flaggedCount={flaggedCount}
            />
          </div>
        </section>
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
        <div className="rounded-[2rem] border border-border/70 bg-gradient-to-br from-background via-background to-muted/15 p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">History audit ledger</p>
              <p className="text-xs text-muted-foreground">
                ตารางนี้ใช้ไล่ตรวจรายการที่ถูกบันทึกแล้ว และเปิดต่อไปยังประวัติรายพนักงานเมื่อจำเป็น
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <Search className="size-3.5" />
                รวม {total} รายการ
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700">
                เปิดดูต่อจากปุ่มในคอลัมน์จัดการ
              </span>
            </div>
          </div>
          <div>
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
