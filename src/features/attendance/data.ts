import {
  effectiveAttendanceIsLate,
  formatIctTime,
  type ShiftLateSchedule,
} from "@/lib/attendance/late"
import { computePaidWorkMinutes } from "@/lib/attendance/paid-work-time"
import { profileScheduleFromTimes } from "@/lib/attendance/profile-schedule"
import {
  sessionCycleStartUtc,
  sessionCutoffUtcForCheckIn,
} from "@/lib/attendance/session-cycle"
import { createClient } from "@/lib/supabase/server"
import type {
  AttendanceLocationReviewStatus,
  AttendanceRow,
  AttendanceStatus,
  AttendanceSummary,
} from "@/features/attendance/types"
import { formatShiftTimeRange } from "@/features/shifts/format"

import { ATTENDANCE_PAGE_SIZE } from "@/features/attendance/types"
import { EMPLOYEE_VIA_ATTENDANCE } from "@/lib/supabase/employee-embeds"
import { BRANCH_VIA_EMPLOYEE } from "@/lib/supabase/branch-embeds"

export { ATTENDANCE_PAGE_SIZE } from "@/features/attendance/types"
export type { AttendanceRow, AttendanceSummary } from "@/features/attendance/types"

export type AttendanceEmployeeOption = {
  id: string
  name: string
  employeeCode: string
}

export type AttendanceListParams = {
  from?: string
  to?: string
  dept?: string
  employee?: string
  branch_id?: string
  shift_id?: string
  status?: string
  page?: number
}

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  normal: "ปกติ",
  late: "สาย",
  in_progress: "กำลังทำงาน",
}

const LOCATION_REVIEW_LABEL: Record<AttendanceLocationReviewStatus, string> = {
  clear: "ตำแหน่งปกติ",
  pending_hr: "รอ HR ตรวจพิกัด",
  approved: "HR อนุมัติพิกัด",
  rejected: "พิกัดถูกปฏิเสธ",
}

function ictDateFromIso(iso: string): string {
  const ICT_OFFSET_MS = 7 * 60 * 60 * 1000
  return new Date(new Date(iso).getTime() + ICT_OFFSET_MS).toISOString().slice(0, 10)
}

function defaultRange(): { from: string; to: string } {
  const now = new Date()
  const ICT_OFFSET_MS = 7 * 60 * 60 * 1000
  const cycleStart = sessionCycleStartUtc(now)
  const to = new Date(cycleStart.getTime() + ICT_OFFSET_MS).toISOString().slice(0, 10)
  const fromDate = new Date(cycleStart.getTime() - 29 * 86_400_000 + ICT_OFFSET_MS)
  const from = fromDate.toISOString().slice(0, 10)
  return { from, to }
}

export function normalizeAttendanceParams(raw: {
  [key: string]: string | string[] | undefined
}): Required<AttendanceListParams> {
  const get = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : "")
  const defaults = defaultRange()
  const page = Math.max(1, Number.parseInt(get("page"), 10) || 1)
  return {
    from: get("from") || defaults.from,
    to: get("to") || defaults.to,
    dept: get("dept"),
    employee: get("employee"),
    branch_id: get("branch_id"),
    shift_id: get("shift_id"),
    status: get("status"),
    page,
  }
}

function formatEmployeeCode(employeeId: string, employeeCode: string | null | undefined): string {
  const trimmed = employeeCode?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : employeeId.slice(0, 8).toUpperCase()
}

function buildEmployeeAttendanceHref(employeeId: string, date: string): string {
  return `/admin/employees/${employeeId}/attendance?month=${date.slice(0, 7)}&date=${date}&from=${date}&to=${date}`
}

function deriveStatus(
  isLate: boolean,
  checkOutAt: string | null,
  checkInAt: string,
  now: Date
): AttendanceStatus {
  if (!checkOutAt) {
    if (now.getTime() < sessionCutoffUtcForCheckIn(new Date(checkInAt)).getTime()) {
      return "in_progress"
    }
  }
  return isLate ? "late" : "normal"
}

function attendanceWorkDate(checkInAt: string, shiftDate: string | null): string {
  return shiftDate ?? ictDateFromIso(checkInAt)
}

function buildAttendanceDateFilter(
  params: Required<AttendanceListParams>,
  rangeStart: Date,
  rangeEnd: Date
): string {
  return [
    `and(shift_date.gte.${params.from},shift_date.lte.${params.to})`,
    `and(shift_date.is.null,check_in_at.gte.${rangeStart.toISOString()},check_in_at.lt.${rangeEnd.toISOString()})`,
  ].join(",")
}

function resolvePaidWorkHours({
  checkInAt,
  checkOutAt,
  storedWorkHours,
  shift,
  defaultCheckInTime,
  defaultCheckOutTime,
  shiftDate,
  workDate,
}: {
  checkInAt: string
  checkOutAt: string | null
  storedWorkHours: number | null
  shift: WorkShiftJoin | null
  defaultCheckInTime: string | null
  defaultCheckOutTime: string | null
  shiftDate?: string | null
  workDate?: string | null
}): number | null {
  if (!checkOutAt) return storedWorkHours

  const checkIn = new Date(checkInAt)
  const checkOut = new Date(checkOutAt)
  if (!Number.isFinite(checkIn.getTime()) || !Number.isFinite(checkOut.getTime())) {
    return storedWorkHours
  }

  const shiftWindow =
    shift &&
    [shift.start_hour, shift.start_minute, shift.end_hour, shift.end_minute].every(
      (value) => Number.isFinite(value as number)
    )
      ? {
          start_hour: shift.start_hour,
          start_minute: shift.start_minute,
          end_hour: shift.end_hour,
          end_minute: shift.end_minute,
          grace_minutes: shift.grace_minutes,
          crosses_midnight: shift.crosses_midnight,
        }
      : null

  const computed = computePaidWorkMinutes({
    workDate: workDate ?? shiftDate ?? undefined,
    shiftDate: shiftDate ?? undefined,
    checkInAt: checkIn,
    checkOutAt: checkOut,
    shift: shiftWindow,
    defaultCheckInTime,
    defaultCheckOutTime,
  })

  return Number.isFinite(computed.paidHours) ? computed.paidHours : storedWorkHours
}

const EMPLOYEE_SCHEDULE_EMBED =
  "default_check_in_time, default_check_out_time, hr_work_shifts(id, code, name, start_hour, start_minute, end_hour, end_minute, grace_minutes, crosses_midnight)"

type WorkShiftJoin = {
  id?: string
  code?: string | null
  name?: string | null
  start_hour: number
  start_minute: number
  end_hour: number
  end_minute: number
  grace_minutes: number
  crosses_midnight: boolean
}

function shiftFromJoin(
  joined: WorkShiftJoin | WorkShiftJoin[] | null | undefined
): ShiftLateSchedule | null {
  if (!joined) return null
  const shift = Array.isArray(joined) ? joined[0] : joined
  if (!shift) return null
  return {
    start_hour: shift.start_hour,
    start_minute: shift.start_minute,
    grace_minutes: shift.grace_minutes,
    crosses_midnight: shift.crosses_midnight,
  }
}

function scheduleFromJoin(
  joined:
    | {
        default_check_in_time?: string | null
        default_check_out_time?: string | null
        hr_work_shifts?: WorkShiftJoin | WorkShiftJoin[] | null
      }
    | Array<{
        default_check_in_time?: string | null
        default_check_out_time?: string | null
        hr_work_shifts?: WorkShiftJoin | WorkShiftJoin[] | null
      }>
): {
  defaultCheckInTime: string | null
  defaultCheckOutTime: string | null
  shift: ShiftLateSchedule | null
} {
  const emp = Array.isArray(joined) ? joined[0] : joined
  const shift = shiftFromJoin(emp?.hr_work_shifts)
  return {
    defaultCheckInTime: emp?.default_check_in_time ?? null,
    defaultCheckOutTime: emp?.default_check_out_time ?? null,
    shift:
      profileScheduleFromTimes(
        emp?.default_check_in_time ?? null,
        emp?.default_check_out_time ?? null
      ) ?? shift,
  }
}

function shiftWindowFromJoin(
  joined:
    | {
        hr_work_shifts?: WorkShiftJoin | WorkShiftJoin[] | null
      }
    | Array<{
        hr_work_shifts?: WorkShiftJoin | WorkShiftJoin[] | null
      }>
): WorkShiftJoin | null {
  const emp = Array.isArray(joined) ? joined[0] : joined
  const shift = emp?.hr_work_shifts
  if (!shift) return null
  return Array.isArray(shift) ? (shift[0] ?? null) : shift
}

function employeeJoin(
  joined:
    | {
        id?: string
        name: string
        employee_code?: string | null
        department: string | null
        branch_id: string | null
        default_check_in_time?: string | null
        default_check_out_time?: string | null
        hr_work_shifts?: WorkShiftJoin | WorkShiftJoin[] | null
        hr_branches: { name: string } | Array<{ name: string }> | null
      }
    | Array<{
        id?: string
        name: string
        employee_code?: string | null
        department: string | null
        branch_id: string | null
        default_check_in_time?: string | null
        default_check_out_time?: string | null
        hr_work_shifts?: WorkShiftJoin | WorkShiftJoin[] | null
        hr_branches: { name: string } | Array<{ name: string }> | null
      }>
): {
  name: string
  employeeCode: string
  department: string | null
  branchName: string | null
  defaultCheckInTime: string | null
  defaultCheckOutTime: string | null
  shift: ShiftLateSchedule | null
  shiftWindow: WorkShiftJoin | null
  shiftName: string | null
  shiftTimeText: string | null
  shiftCrossesMidnight: boolean
} {
  const emp = Array.isArray(joined) ? joined[0] : joined
  const branchRaw = emp.hr_branches
  const branchName = branchRaw
    ? Array.isArray(branchRaw)
      ? (branchRaw[0]?.name ?? null)
      : branchRaw.name
    : null
  const rawShift = Array.isArray(emp.hr_work_shifts) ? emp.hr_work_shifts[0] : emp.hr_work_shifts
  const profileShift = profileScheduleFromTimes(
    emp.default_check_in_time ?? null,
    emp.default_check_out_time ?? null
  )
  const shift = profileShift ?? shiftFromJoin(emp.hr_work_shifts)
  return {
    name: emp.name,
    employeeCode: formatEmployeeCode(emp.id ?? "", emp.employee_code ?? null),
    department: emp.department,
    branchName,
    defaultCheckInTime: emp.default_check_in_time ?? null,
    defaultCheckOutTime: emp.default_check_out_time ?? null,
    shift,
    shiftWindow: rawShift ?? profileShift,
    shiftName: rawShift?.name ?? rawShift?.code ?? null,
    shiftTimeText: rawShift ? formatShiftTimeRange(rawShift) : null,
    shiftCrossesMidnight: Boolean(rawShift?.crosses_midnight ?? profileShift?.crosses_midnight),
  }
}

export async function getAttendanceDepartments(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("hr_employees")
    .select("department")
    .not("department", "is", null)
  if (error) throw error
  return [...new Set((data ?? []).map((r) => r.department as string))].sort()
}

export async function getAttendanceEmployees(
  branchId = ""
): Promise<AttendanceEmployeeOption[]> {
  const supabase = await createClient()
  let query = supabase
    .from("hr_employees")
    .select("id, name, employee_code")
    .eq("status", "active")
    .order("name")
  if (branchId === "__none__") {
    query = query.is("branch_id", null)
  } else if (branchId) {
    query = query.eq("branch_id", branchId)
  }
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    employeeCode: formatEmployeeCode(row.id as string, row.employee_code as string | null | undefined),
  }))
}

export async function getAttendanceRecords(params: Required<AttendanceListParams>) {
  const supabase = await createClient()
  const now = new Date()
  const ICT_OFFSET_MS = 7 * 60 * 60 * 1000
  const rangeStart = new Date(Date.parse(`${params.from}T00:00:00Z`) - ICT_OFFSET_MS)
  const rangeEnd = new Date(
    Date.parse(`${params.to}T00:00:00Z`) - ICT_OFFSET_MS + 86_400_000
  )
  const attendanceDateFilter = buildAttendanceDateFilter(params, rangeStart, rangeEnd)

  let employeeIds: string[] | null = null
  const employeeSearch = params.employee.trim()
  if (params.dept || employeeSearch || params.branch_id) {
    let empQuery = supabase.from("hr_employees").select("id")
    if (params.dept) empQuery = empQuery.eq("department", params.dept)
    if (employeeSearch) {
      const like = `%${employeeSearch.replace(/[%_]/g, "\\$&")}%`
      const terms = [`name.ilike.${like}`, `employee_code.ilike.${like}`]
      if (/^[0-9a-f-]{36}$/i.test(employeeSearch)) {
        terms.push(`id.eq.${employeeSearch}`)
      }
      empQuery = empQuery.or(terms.join(","))
    }
    if (params.branch_id === "__none__") {
      empQuery = empQuery.is("branch_id", null)
    } else if (params.branch_id) {
      empQuery = empQuery.eq("branch_id", params.branch_id)
    }
    const { data: emps, error: empError } = await empQuery
    if (empError) throw empError
    employeeIds = (emps ?? []).map((e) => e.id)
    if (employeeIds.length === 0) {
      return {
        rows: [] as AttendanceRow[],
        total: 0,
        summary: { workDays: 0, totalHours: 0, lateCount: 0, inProgressCount: 0 },
      }
    }
  }

  let query = supabase
    .from("hr_attendance")
    .select(
      `id, employee_id, check_in_at, check_out_at, shift_date, is_late, work_hours, location_review_status, location_review_flags, location_review_note, ${EMPLOYEE_VIA_ATTENDANCE}!inner(id, name, employee_code, department, branch_id, ${EMPLOYEE_SCHEDULE_EMBED}, ${BRANCH_VIA_EMPLOYEE}(name))`,
      { count: "exact" }
    )
    .or(attendanceDateFilter)
    .order("shift_date", { ascending: false, nullsFirst: false })
    .order("check_in_at", { ascending: false })

  if (employeeIds) {
    query = query.in("employee_id", employeeIds)
  }
  if (params.shift_id === "__none__") {
    query = query.is("work_shift_id", null)
  } else if (params.shift_id) {
    query = query.eq("work_shift_id", params.shift_id)
  }
  if (params.status === "late") {
    query = query.eq("is_late", true)
  } else if (params.status === "open") {
    query = query.is("check_out_at", null)
  } else if (params.status === "location_review") {
    query = query.eq("location_review_status", "pending_hr")
  }

  const { data, count, error } = await query.range(
    (params.page - 1) * ATTENDANCE_PAGE_SIZE,
    params.page * ATTENDANCE_PAGE_SIZE - 1
  )
  if (error) throw error

  type RawRow = {
    id: string
    employee_id: string
    check_in_at: string
    check_out_at: string | null
    shift_date: string | null
    is_late: boolean
    work_hours: number | null
    location_review_status: AttendanceLocationReviewStatus | null
    location_review_flags: string[] | null
    location_review_note: string | null
    hr_employees:
      | {
          id?: string
          name: string
          employee_code?: string | null
          department: string | null
          branch_id: string | null
          default_check_in_time?: string | null
          default_check_out_time?: string | null
          hr_work_shifts?: WorkShiftJoin | WorkShiftJoin[] | null
          hr_branches: { name: string } | Array<{ name: string }> | null
        }
      | Array<{
          id?: string
          name: string
          employee_code?: string | null
          department: string | null
          branch_id: string | null
          default_check_in_time?: string | null
          default_check_out_time?: string | null
          hr_work_shifts?: WorkShiftJoin | WorkShiftJoin[] | null
          hr_branches: { name: string } | Array<{ name: string }> | null
        }>
  }

  const rows: AttendanceRow[] = ((data ?? []) as RawRow[]).map((row) => {
    const emp = employeeJoin(row.hr_employees)
    const workDate = attendanceWorkDate(row.check_in_at, row.shift_date)
    const isLate = effectiveAttendanceIsLate(
      row.check_in_at,
      emp.shift,
      row.is_late,
      emp.defaultCheckInTime
    )
    const status = deriveStatus(
      isLate,
      row.check_out_at,
      row.check_in_at,
      now
    )
    const workHours = resolvePaidWorkHours({
      checkInAt: row.check_in_at,
      checkOutAt: row.check_out_at,
      storedWorkHours: row.work_hours,
      shift: emp.shiftWindow,
      defaultCheckInTime: emp.defaultCheckInTime,
      defaultCheckOutTime: emp.defaultCheckOutTime,
      shiftDate: row.shift_date,
      workDate: row.shift_date,
    })

    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: emp.name,
      employeeCode: emp.employeeCode,
      employeeHref: buildEmployeeAttendanceHref(row.employee_id, workDate),
      department: emp.department,
      branchName: emp.branchName,
      shiftName: emp.shiftName,
      shiftTimeText: emp.shiftTimeText,
      shiftCrossesMidnight: emp.shiftCrossesMidnight,
      date: workDate,
      checkInAt: row.check_in_at,
      checkOutAt: row.check_out_at,
      checkInText: formatIctTime(new Date(row.check_in_at)),
      checkOutText: row.check_out_at ? formatIctTime(new Date(row.check_out_at)) : "—",
      workHours,
      status,
      statusLabel: STATUS_LABEL[status],
      locationReviewStatus: row.location_review_status ?? "clear",
      locationReviewLabel: LOCATION_REVIEW_LABEL[row.location_review_status ?? "clear"],
      locationReviewFlags: row.location_review_flags ?? [],
      locationReviewNote: row.location_review_note ?? null,
    }
  })

  let summaryQuery = supabase
    .from("hr_attendance")
    .select(
      `check_in_at, check_out_at, shift_date, is_late, work_hours, employee_id, ${EMPLOYEE_VIA_ATTENDANCE}!inner(${EMPLOYEE_SCHEDULE_EMBED})`
    )
    .or(attendanceDateFilter)

  if (employeeIds) {
    summaryQuery = summaryQuery.in("employee_id", employeeIds)
  }
  if (params.shift_id === "__none__") {
    summaryQuery = summaryQuery.is("work_shift_id", null)
  } else if (params.shift_id) {
    summaryQuery = summaryQuery.eq("work_shift_id", params.shift_id)
  }
  if (params.status === "late") {
    summaryQuery = summaryQuery.eq("is_late", true)
  } else if (params.status === "open") {
    summaryQuery = summaryQuery.is("check_out_at", null)
  } else if (params.status === "location_review") {
    summaryQuery = summaryQuery.eq("location_review_status", "pending_hr")
  }

  const { data: summaryRows, error: summaryError } = await summaryQuery
  if (summaryError) throw summaryError

  type SummaryRow = {
    check_in_at: string
    check_out_at: string | null
    shift_date: string | null
    is_late: boolean
    work_hours: number | null
    hr_employees:
      | {
          default_check_in_time?: string | null
          default_check_out_time?: string | null
          hr_work_shifts?: WorkShiftJoin | WorkShiftJoin[] | null
        }
      | Array<{
          default_check_in_time?: string | null
          default_check_out_time?: string | null
          hr_work_shifts?: WorkShiftJoin | WorkShiftJoin[] | null
        }>
  }

  const resolvedSummaryRows = ((summaryRows ?? []) as SummaryRow[]).map((row) => {
    const schedule = scheduleFromJoin(row.hr_employees)
    return {
      isLate: effectiveAttendanceIsLate(
        row.check_in_at,
        schedule.shift,
        row.is_late,
        schedule.defaultCheckInTime
      ),
      workHours: resolvePaidWorkHours({
        checkInAt: row.check_in_at,
        checkOutAt: row.check_out_at,
        storedWorkHours: row.work_hours,
        shift: shiftWindowFromJoin(row.hr_employees),
        defaultCheckInTime: schedule.defaultCheckInTime,
        defaultCheckOutTime: schedule.defaultCheckOutTime,
        shiftDate: row.shift_date,
        workDate: row.shift_date,
      }),
    }
  })

  // Fetch HR-set day-off overrides in the same date range to include their hours in the summary
  const PAID_DAY_OFF_HOURS = 12
  let dateOverrideQuery = supabase
    .from("hr_employee_date_overrides")
    .select("employee_id, date")
    .gte("date", params.from)
    .lte("date", params.to)
  if (employeeIds) {
    dateOverrideQuery = dateOverrideQuery.in("employee_id", employeeIds)
  } else if (params.employee) {
    dateOverrideQuery = dateOverrideQuery.eq("employee_id", params.employee)
  }
  const { data: dateOverrides } = await dateOverrideQuery

  const dateOverrideCount = (dateOverrides ?? []).length

  const summary: AttendanceSummary = {
    workDays: (summaryRows ?? []).length + dateOverrideCount,
    totalHours:
      resolvedSummaryRows.reduce((sum, row) => sum + (row.workHours ?? 0), 0) +
      dateOverrideCount * PAID_DAY_OFF_HOURS,
    lateCount: resolvedSummaryRows.filter((row) => row.isLate).length,
    inProgressCount: ((summaryRows ?? []) as SummaryRow[]).filter(
      (row) =>
        !row.check_out_at &&
        now.getTime() < sessionCutoffUtcForCheckIn(new Date(row.check_in_at)).getTime()
    ).length,
  }

  return { rows, total: count ?? 0, summary }
}
