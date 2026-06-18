import { deriveAttendanceDayStatus } from "@/features/attendance/day-status"
import { ictDateFromUtc, ictLocalToUtc } from "@/lib/attendance/ict-datetime"
import {
  isWithinRetroWindow,
  type ShiftSchedule,
} from "@/lib/attendance/retro-limit"
import { getAttendanceGoLiveDate } from "@/lib/runtime-config"
import { createClient } from "@/lib/supabase/server"

export type HrAttendanceIssue = {
  employeeId: string
  employeeName: string
  department: string | null
  workDate: string
  issue: "missing_checkin" | "missing_checkout"
  retroEligible: boolean
  href: string
}

function monthFromDate(date: string): string {
  return date.slice(0, 7)
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

function monthRange(month: string): string[] {
  const [y, m] = month.split("-").map(Number)
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return Array.from(
    { length: lastDay },
    (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`
  )
}

function expandLeaveDates(
  rows: Array<{ employee_id: string; start_date: string; end_date: string }>
): Map<string, Set<string>> {
  const byEmployee = new Map<string, Set<string>>()
  for (const row of rows) {
    let cursor = row.start_date
    while (cursor <= row.end_date) {
      let dates = byEmployee.get(row.employee_id)
      if (!dates) {
        dates = new Set<string>()
        byEmployee.set(row.employee_id, dates)
      }
      dates.add(cursor)
      cursor = addDays(cursor, 1)
    }
  }
  return byEmployee
}

function issueFromDay(
  employee: { id: string; name: string; department: string | null },
  workDate: string,
  status: ReturnType<typeof deriveAttendanceDayStatus>,
  shift: ShiftSchedule | null,
  now: Date
): HrAttendanceIssue | null {
  if (status !== "missing_checkin" && status !== "missing_checkout") return null
  const retroEligible = shift ? isWithinRetroWindow(workDate, shift, now) : false
  return {
    employeeId: employee.id,
    employeeName: employee.name,
    department: employee.department,
    workDate,
    issue: status,
    retroEligible,
    href: `/admin/employees/${employee.id}/attendance?month=${monthFromDate(workDate)}&date=${workDate}`,
  }
}

export async function getHrAttendanceIssues(
  now: Date = new Date(),
  limit = 30
): Promise<HrAttendanceIssue[]> {
  const supabase = await createClient()
  const shifted = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  const month = `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`
  const prev = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() - 1, 1))
  const prevMonth = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}`
  const today = shifted.toISOString().slice(0, 10)
  const days = [...monthRange(prevMonth), ...monthRange(month)]
  const rangeStart = days[0]!
  const rangeEnd = days[days.length - 1]!
  const rangeStartUtc = ictLocalToUtc(rangeStart, "00:00").toISOString()
  const rangeEndUtc = ictLocalToUtc(addDays(rangeEnd, 1), "00:00").toISOString()

  const [{ data: employees, error }, goLiveDate] = await Promise.all([
    supabase
      .from("hr_employees")
      .select("id, name, department, work_shift_id")
      .eq("status", "active")
      .not("work_shift_id", "is", null)
      .order("name"),
    getAttendanceGoLiveDate(),
  ])
  if (error) throw error
  if (!employees?.length) return []

  const employeeIds = employees.map((employee) => employee.id)
  const shiftIds = [...new Set(employees.map((employee) => employee.work_shift_id).filter(Boolean))]

  const [shiftRes, attendanceRes, leaveRes] = await Promise.all([
    supabase
      .from("hr_work_shifts")
      .select(
        "id, start_hour, start_minute, end_hour, end_minute, crosses_midnight, grace_minutes"
      )
      .eq("is_active", true)
      .in("id", shiftIds),
    supabase
      .from("hr_attendance")
      .select("id, employee_id, check_in_at, check_out_at, is_late, shift_date")
      .in("employee_id", employeeIds)
      .gte("check_in_at", rangeStartUtc)
      .lt("check_in_at", rangeEndUtc),
    supabase
      .from("hr_leaves")
      .select("employee_id, start_date, end_date")
      .in("employee_id", employeeIds)
      .eq("status", "approved")
      .lte("start_date", rangeEnd)
      .gte("end_date", rangeStart),
  ])
  if (shiftRes.error) throw shiftRes.error
  if (attendanceRes.error) throw attendanceRes.error
  if (leaveRes.error) throw leaveRes.error

  const shifts = new Map<string, ShiftSchedule>()
  for (const row of shiftRes.data ?? []) {
    shifts.set(row.id as string, row as ShiftSchedule)
  }

  const attendanceByEmployeeDate = new Map<
    string,
    {
      check_in_at: string
      check_out_at: string | null
      is_late: boolean
    }
  >()
  for (const row of attendanceRes.data ?? []) {
    const workDate =
      (row.shift_date as string | null) ?? ictDateFromUtc(new Date(row.check_in_at as string))
    const key = `${row.employee_id}:${workDate}`
    if (!attendanceByEmployeeDate.has(key)) {
      attendanceByEmployeeDate.set(key, {
        check_in_at: row.check_in_at as string,
        check_out_at: row.check_out_at as string | null,
        is_late: Boolean(row.is_late),
      })
    }
  }

  const leaveDatesByEmployee = expandLeaveDates(
    (leaveRes.data ?? []) as Array<{
      employee_id: string
      start_date: string
      end_date: string
    }>
  )

  const issues: HrAttendanceIssue[] = []

  for (const employee of employees ?? []) {
    const shift = employee.work_shift_id
      ? (shifts.get(employee.work_shift_id) ?? null)
      : null
    const leaveDates = leaveDatesByEmployee.get(employee.id) ?? new Set<string>()

    for (const workDate of days) {
      if (goLiveDate && workDate < goLiveDate) continue
      const record = attendanceByEmployeeDate.get(`${employee.id}:${workDate}`) ?? null
      const status = deriveAttendanceDayStatus(
        workDate,
        today,
        now,
        shift,
        leaveDates.has(workDate),
        record,
        goLiveDate
      )
      const issue = issueFromDay(
        employee as { id: string; name: string; department: string | null },
        workDate,
        status,
        shift,
        now
      )
      if (issue) issues.push(issue)
    }
  }

  return issues
    .sort((a, b) => {
      if (a.retroEligible !== b.retroEligible) return a.retroEligible ? -1 : 1
      return b.workDate.localeCompare(a.workDate)
    })
    .slice(0, limit)
}
