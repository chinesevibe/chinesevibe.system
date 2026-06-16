import { ictDayRangeUtc, formatIctTime } from "@/lib/attendance/late"
import { createClient } from "@/lib/supabase/server"
import type {
  AttendanceLocationReviewStatus,
  AttendanceRow,
  AttendanceStatus,
  AttendanceSummary,
} from "@/features/attendance/types"

import { ATTENDANCE_PAGE_SIZE } from "@/features/attendance/types"

export { ATTENDANCE_PAGE_SIZE } from "@/features/attendance/types"
export type { AttendanceRow, AttendanceSummary } from "@/features/attendance/types"

export type AttendanceListParams = {
  from?: string
  to?: string
  dept?: string
  employee?: string
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
  const { start } = ictDayRangeUtc(now)
  const ICT_OFFSET_MS = 7 * 60 * 60 * 1000
  const to = new Date(start.getTime() + ICT_OFFSET_MS).toISOString().slice(0, 10)
  const fromDate = new Date(start.getTime() - 29 * 86_400_000 + ICT_OFFSET_MS)
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
    page,
  }
}

function deriveStatus(
  isLate: boolean,
  checkOutAt: string | null,
  checkInAt: string
): AttendanceStatus {
  if (!checkOutAt) {
    const { end } = ictDayRangeUtc(new Date())
    const isToday = new Date(checkInAt).getTime() >= ictDayRangeUtc(new Date()).start.getTime()
    if (isToday && new Date() < end) return "in_progress"
  }
  return isLate ? "late" : "normal"
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

export async function getAttendanceEmployees(): Promise<
  Array<{ id: string; name: string }>
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("hr_employees")
    .select("id, name")
    .eq("status", "active")
    .order("name")
  if (error) throw error
  return (data ?? []) as Array<{ id: string; name: string }>
}

export async function getAttendanceRecords(params: Required<AttendanceListParams>) {
  const supabase = await createClient()
  const ICT_OFFSET_MS = 7 * 60 * 60 * 1000
  const rangeStart = new Date(Date.parse(`${params.from}T00:00:00Z`) - ICT_OFFSET_MS)
  const rangeEnd = new Date(
    Date.parse(`${params.to}T00:00:00Z`) - ICT_OFFSET_MS + 86_400_000
  )

  let employeeIds: string[] | null = null
  if (params.dept || params.employee) {
    let empQuery = supabase.from("hr_employees").select("id")
    if (params.dept) empQuery = empQuery.eq("department", params.dept)
    if (params.employee) empQuery = empQuery.eq("id", params.employee)
    const { data: emps, error: empError } = await empQuery
    if (empError) throw empError
    employeeIds = (emps ?? []).map((e) => e.id)
    if (employeeIds.length === 0) {
      return {
        rows: [] as AttendanceRow[],
        total: 0,
        summary: { workDays: 0, totalHours: 0, lateCount: 0 },
      }
    }
  }

  let query = supabase
    .from("hr_attendance")
    .select(
      "id, employee_id, check_in_at, check_out_at, is_late, work_hours, location_review_status, location_review_flags, location_review_note, hr_employees!inner(name, department)",
      { count: "exact" }
    )
    .gte("check_in_at", rangeStart.toISOString())
    .lt("check_in_at", rangeEnd.toISOString())
    .order("check_in_at", { ascending: false })

  if (employeeIds) {
    query = query.in("employee_id", employeeIds)
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
    is_late: boolean
    work_hours: number | null
    location_review_status: AttendanceLocationReviewStatus | null
    location_review_flags: string[] | null
    location_review_note: string | null
    hr_employees:
      | { name: string; department: string | null }
      | Array<{ name: string; department: string | null }>
  }

  function employeeJoin(
    joined: RawRow["hr_employees"]
  ): { name: string; department: string | null } {
    return Array.isArray(joined) ? joined[0] : joined
  }

  const rows: AttendanceRow[] = ((data ?? []) as RawRow[]).map((row) => {
    const emp = employeeJoin(row.hr_employees)
    const status = deriveStatus(row.is_late, row.check_out_at, row.check_in_at)
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: emp.name,
      department: emp.department,
      date: ictDateFromIso(row.check_in_at),
      checkInAt: row.check_in_at,
      checkOutAt: row.check_out_at,
      checkInText: formatIctTime(new Date(row.check_in_at)),
      checkOutText: row.check_out_at ? formatIctTime(new Date(row.check_out_at)) : "—",
      workHours: row.work_hours,
      status,
      statusLabel: STATUS_LABEL[status],
      locationReviewStatus: row.location_review_status ?? "clear",
      locationReviewLabel: LOCATION_REVIEW_LABEL[row.location_review_status ?? "clear"],
      locationReviewFlags: row.location_review_flags ?? [],
      locationReviewNote: row.location_review_note ?? null,
    }
  })

  // Monthly summary for the filtered range (all matching rows, not just page).
  let summaryQuery = supabase
    .from("hr_attendance")
    .select("is_late, work_hours, employee_id")
    .gte("check_in_at", rangeStart.toISOString())
    .lt("check_in_at", rangeEnd.toISOString())

  if (employeeIds) {
    summaryQuery = summaryQuery.in("employee_id", employeeIds)
  }

  const { data: summaryRows, error: summaryError } = await summaryQuery
  if (summaryError) throw summaryError

  const summary: AttendanceSummary = {
    workDays: (summaryRows ?? []).length,
    totalHours: (summaryRows ?? []).reduce(
      (sum, r) => sum + (Number(r.work_hours) || 0),
      0
    ),
    lateCount: (summaryRows ?? []).filter((r) => r.is_late).length,
  }

  return { rows, total: count ?? 0, summary }
}
