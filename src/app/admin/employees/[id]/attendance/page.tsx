import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ArrowLeft, MoonStar } from "lucide-react"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { AttendanceAddButton } from "@/features/attendance/AttendanceHrActions"
import { AttendanceCalendar } from "@/features/attendance/AttendanceCalendar"
import { CalendarHrWrapper } from "@/features/attendance/CalendarHrWrapper"
import { AttendanceFilters } from "@/features/attendance/AttendanceFilters"
import { AttendancePagination } from "@/features/attendance/AttendancePagination"
import { AttendanceTable } from "@/features/attendance/AttendanceTable"
import { AttendanceSummaryCard } from "@/features/attendance/AttendanceSummary"
import { ExportCsvButton } from "@/features/attendance/ExportCsvButton"
import { getEmployeeAttendanceCalendar } from "@/features/attendance/calendar"
import {
  getAttendanceDepartments,
  getAttendanceEmployees,
  getAttendanceRecords,
  normalizeAttendanceParams,
} from "@/features/attendance/data"
import { getEmployeeProfile } from "@/features/employees/profile/data"
import { formatShiftTimeRange } from "@/features/shifts/format"
import { getPayrollConfig } from "@/lib/payroll/config"
import { canManageHr } from "@/lib/auth/roles"
import { sanitizeReturnTo } from "@/lib/navigation/return-to"
import { getCurrentEmployee } from "@/lib/auth/session"

function currentMonth(): string {
  const shifted = new Date(Date.now() + 7 * 60 * 60 * 1000)
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`
}

function formatMonthLabel(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number)
  if (!year || !monthIndex) return month
  return new Intl.DateTimeFormat("th-TH", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date(Date.UTC(year, monthIndex - 1, 1)))
}

function formatDateLabel(date: string | null): string {
  if (!date) return "ไม่ได้เลือกวันที่เฉพาะ"
  const parsed = new Date(`${date}T00:00:00+07:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return new Intl.DateTimeFormat("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(parsed)
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
  const returnTo = sanitizeReturnTo(
    typeof rawParams.returnTo === "string" ? rawParams.returnTo : null
  )

  const listParams = normalizeAttendanceParams({
    ...rawParams,
    employee: id,
  })
  const canManage = caller ? canManageHr(caller.role) : false
  const now = new Date()
  const selectedDate = highlightDate ?? listParams.to

  const [
    { rows, total, summary },
    departments,
    employees,
    calendar,
    payrollConfig,
  ] =
    await Promise.all([
      getAttendanceRecords(listParams),
      getAttendanceDepartments(),
      getAttendanceEmployees(),
      getEmployeeAttendanceCalendar(id, month, now),
      getPayrollConfig(),
    ])

  const totalHours = summary.totalHours
  const employeeRatePerHour =
    profile.pay_type === "monthly"
      ? payrollConfig.monthly_std_hours > 0 && profile.salary != null
        ? profile.salary / payrollConfig.monthly_std_hours
        : 0
      : profile.salary ?? 0

  const estimatedEarnings =
    profile.salary == null || employeeRatePerHour <= 0
      ? null
      : Math.round(totalHours * employeeRatePerHour * 100) / 100

  const amountFormatter = new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const attendanceSummary = {
    ...summary,
    estimatedEarnings:
      estimatedEarnings == null ? null : amountFormatter.format(estimatedEarnings),
  }

  const employeeCode =
    profile.employee_code?.trim() || profile.id.slice(0, 8).toUpperCase()
  const basePath = `/admin/employees/${profile.id}/attendance`
  const backHref = returnTo ?? `/admin/employees/${profile.id}`
  const shiftName = profile.workShift?.name ?? profile.workShift?.code ?? null
  const shiftTime = profile.workShift ? formatShiftTimeRange(profile.workShift) : null
  const shiftDetail = [shiftName, shiftTime].filter(Boolean).join(" • ")
  const isOvernightShift = Boolean(profile.workShift?.crosses_midnight)
  const monthLinkQuery: Record<string, string> = {}
  if (returnTo) monthLinkQuery.returnTo = returnTo
  if (listParams.from) monthLinkQuery.from = listParams.from
  if (listParams.to) monthLinkQuery.to = listParams.to
  if (listParams.page > 1) monthLinkQuery.page = String(listParams.page)
  if (listParams.branch_id) monthLinkQuery.branch_id = listParams.branch_id
  if (listParams.dept) monthLinkQuery.dept = listParams.dept

  const dayLinkQuery: Record<string, string> = {}
  if (returnTo) dayLinkQuery.returnTo = returnTo
  if (listParams.branch_id) dayLinkQuery.branch_id = listParams.branch_id
  if (listParams.dept) dayLinkQuery.dept = listParams.dept

  const pendingReviewCount = rows.filter((r) => r.locationReviewStatus === "pending_hr").length
  const flaggedCount = rows.filter(
    (r) =>
      !r.checkOutAt ||
      r.status === "late" ||
      r.locationReviewStatus === "pending_hr" ||
      r.locationReviewStatus === "rejected" ||
      r.locationReviewFlags.length > 0
  ).length

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <AdminPageShell fill title={profile.name}>
        <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">

          {/* ── TopBar ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
              <Link
                href={backHref}
                className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-brand-red hover:border-brand-red/30"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                กลับ
              </Link>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-bold text-foreground">{profile.name}</h2>
                  <span className="text-xs text-muted-foreground tabular-nums">{employeeCode}</span>
                  {profile.department ? (
                    <span className="text-xs text-muted-foreground">• {profile.department}</span>
                  ) : null}
                  {isOvernightShift ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                      <MoonStar className="h-3 w-3" />
                      กะข้ามวัน
                    </span>
                  ) : null}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {profile.position ? <span>{profile.position}</span> : null}
                  {shiftDetail ? <span>• {shiftDetail}</span> : null}
                  <span>• {formatMonthLabel(month)}</span>
                  {selectedDate ? (
                    <span className="text-brand-red/80">• {formatDateLabel(selectedDate)}</span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {canManage ? (
                <AttendanceAddButton
                  employees={employees}
                  defaultDate={highlightDate ?? listParams.to}
                />
              ) : null}
              <ExportCsvButton rows={rows} />
            </div>
          </div>

          {/* ── KPI Strip ── */}
          <AttendanceSummaryCard
            summary={attendanceSummary}
            pendingReviewCount={pendingReviewCount}
            flaggedCount={flaggedCount}
            strip
          />

          {/* ── 2-col Main ── */}
          <div className="grid h-full min-h-0 gap-3 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1.3fr)_380px]">
            {/* Left: filter + table */}
            <div className="order-1 flex min-h-0 flex-col gap-2.5 overflow-hidden lg:gap-3">
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
                    shift_id: "",
                    status: "",
                  }}
                />
              </Suspense>
              <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border/60 bg-muted/10">
                <AttendanceTable
                  rows={rows}
                  canManage={canManage}
                  employeeView
                  returnTo={returnTo}
                />
              </div>
              <Suspense fallback={null}>
                <AttendancePagination page={listParams.page} total={total} />
              </Suspense>
            </div>

            {/* Right: calendar */}
            <div className="order-2 min-h-0 overflow-y-auto rounded-xl border border-border/60 bg-muted/10 p-3">
              {canManage ? (
                <CalendarHrWrapper
                  month={month}
                  days={calendar.days}
                  basePath={basePath}
                  selectedDate={highlightDate}
                  monthLinkQuery={monthLinkQuery}
                  dayLinkQuery={dayLinkQuery}
                  employeeId={id}
                />
              ) : (
                <AttendanceCalendar
                  month={month}
                  days={calendar.days}
                  basePath={basePath}
                  selectedDate={highlightDate}
                  monthLinkQuery={monthLinkQuery}
                  dayLinkQuery={dayLinkQuery}
                  linkDays
                  compact
                />
              )}
            </div>
          </div>
        </div>
      </AdminPageShell>
    </div>
  )
}
