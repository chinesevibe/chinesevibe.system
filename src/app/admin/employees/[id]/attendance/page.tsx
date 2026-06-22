import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ArrowLeft } from "lucide-react"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { AttendanceAddButton } from "@/features/attendance/AttendanceHrActions"
import { EmployeeAttendanceAnomalySummary } from "@/features/attendance/EmployeeAttendanceAnomalySummary"
import { AttendanceCalendar } from "@/features/attendance/AttendanceCalendar"
import { EmployeeAttendanceDateContext } from "@/features/attendance/EmployeeAttendanceDateContext"
import { EmployeeAttendanceDiagnosisPanel } from "@/features/attendance/EmployeeAttendanceDiagnosisPanel"
import { AttendanceFilters } from "@/features/attendance/AttendanceFilters"
import { EmployeeAttendanceHeader } from "@/features/attendance/EmployeeAttendanceHeader"
import { AttendancePagination } from "@/features/attendance/AttendancePagination"
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
  const selectedDateParams = {
    ...listParams,
    from: selectedDate,
    to: selectedDate,
    page: 1,
  }

  const [
    { rows, total, summary },
    departments,
    employees,
    calendar,
    payrollConfig,
    selectedDateData,
  ] =
    await Promise.all([
      getAttendanceRecords(listParams),
      getAttendanceDepartments(),
      getAttendanceEmployees(),
      getEmployeeAttendanceCalendar(id, month, now),
      getPayrollConfig(),
      getAttendanceRecords(selectedDateParams),
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
  const backLabel =
    returnTo && !returnTo.startsWith(`/admin/employees/${profile.id}`)
      ? "← กลับหน้าก่อนหน้า"
      : `← กลับโปรไฟล์ ${profile.name}`
  const shiftName = profile.workShift?.name ?? profile.workShift?.code ?? null
  const shiftTime = profile.workShift ? formatShiftTimeRange(profile.workShift) : null
  const shiftDetail = [shiftName, shiftTime].filter(Boolean).join(" • ")
  const isOvernightShift = Boolean(profile.workShift?.crosses_midnight)
  const selectedRows = selectedDateData.rows
  const selectedTotal = selectedDateData.total
  const selectedDateSourceLimited = selectedTotal > selectedRows.length
  const selectedSummary = selectedRows.reduce(
    (acc, row) => {
      acc.total += 1
      if (row.status === "late") acc.late += 1
      if (row.status === "in_progress") acc.open += 1
      if (row.locationReviewStatus === "pending_hr") acc.pendingReview += 1
      if (row.shiftCrossesMidnight) acc.overnight += 1
      return acc
    },
    { total: 0, late: 0, open: 0, pendingReview: 0, overnight: 0 }
  )
  const selectedFlags = [
    selectedSummary.late > 0 ? `มาสาย ${selectedSummary.late}` : null,
    selectedSummary.open > 0 ? `ยังไม่เช็คออก ${selectedSummary.open}` : null,
    selectedSummary.pendingReview > 0
      ? `รอตรวจพิกัด ${selectedSummary.pendingReview}`
      : null,
    selectedSummary.overnight > 0 ? `กะข้ามวัน ${selectedSummary.overnight}` : null,
    selectedRows.length === 0 ? "ไม่พบบันทึกเช็คอิน" : null,
  ].filter(Boolean) as string[]
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

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <AdminPageShell
        fill
        title="ประวัติการเข้างาน"
        description={
          <div className="flex flex-col gap-2">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-red hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{backLabel.replace(/^←\s*/, "")}</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              พื้นที่ตรวจสอบเวลาเข้าออก, ความผิดปกติ, และประวัติรายวันของ {profile.name}
            </p>
          </div>
        }
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
        <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
          <div className="grid gap-3 2xl:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
            <EmployeeAttendanceHeader
              employeeName={profile.name}
              employeeCode={employeeCode}
              department={profile.department}
              position={profile.position}
              shiftDetail={shiftDetail}
              isOvernightShift={isOvernightShift}
            />

            <EmployeeAttendanceDateContext
              monthLabel={formatMonthLabel(month)}
              selectedDateLabel={formatDateLabel(selectedDate)}
              from={listParams.from}
              to={listParams.to}
              page={listParams.page}
              total={total}
            />
          </div>

          <div className="grid gap-3 2xl:grid-cols-[minmax(0,1.12fr)_minmax(280px,0.88fr)]">
            <EmployeeAttendanceDiagnosisPanel
              selectedDateLabel={formatDateLabel(selectedDate)}
              shiftDetail={shiftDetail}
              selectedTotal={selectedTotal}
              selectedSummary={selectedSummary}
              selectedDateSourceLimited={selectedDateSourceLimited}
              selectedFlags={selectedFlags}
              selectedRows={selectedRows}
              fallbackShiftName={shiftName}
              fallbackShiftTime={shiftTime}
            />

            <EmployeeAttendanceAnomalySummary attendanceSummary={attendanceSummary} />
          </div>

          <div className="grid h-full min-h-0 gap-3 overflow-hidden 2xl:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
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

            <div className="order-2 min-h-0 max-h-[320px] overflow-y-auto rounded-xl border border-border/60 bg-muted/10 p-3 sm:max-h-[360px] lg:max-h-none">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-foreground">ปฏิทินและประวัติรายวัน</h3>
                <p className="text-xs text-muted-foreground">
                  เลือกวันเพื่อสลับบริบทของการตรวจสอบ แล้วเทียบกับรายการเวลาทางขวา
                </p>
              </div>
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
            </div>
          </div>
        </div>
      </AdminPageShell>
    </div>
  )
}
