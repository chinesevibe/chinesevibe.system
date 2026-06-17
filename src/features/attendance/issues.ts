import {
  getEmployeeAttendanceCalendar,
  type AttendanceDayCell,
} from "@/features/attendance/calendar"
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

function cellToIssue(
  employee: { id: string; name: string; department: string | null },
  cell: AttendanceDayCell
): HrAttendanceIssue | null {
  if (
    cell.status !== "missing_checkin" &&
    cell.status !== "missing_checkout" &&
    cell.status !== "retro_expired"
  ) {
    return null
  }
  if (cell.status === "retro_expired" && !cell.retroExpired) return null

  const issue =
    cell.status === "missing_checkout" || cell.checkIn
      ? "missing_checkout"
      : "missing_checkin"

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    department: employee.department,
    workDate: cell.date,
    issue,
    retroEligible: cell.retroEligible,
    href: `/admin/employees/${employee.id}/attendance?month=${monthFromDate(cell.date)}&date=${cell.date}`,
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

  const { data: employees, error } = await supabase
    .from("hr_employees")
    .select("id, name, department")
    .eq("status", "active")
    .not("work_shift_id", "is", null)
    .order("name")
  if (error) throw error

  const issues: HrAttendanceIssue[] = []

  for (const employee of employees ?? []) {
    const [current, previous] = await Promise.all([
      getEmployeeAttendanceCalendar(employee.id, month, now),
      getEmployeeAttendanceCalendar(employee.id, prevMonth, now),
    ])

    for (const cell of [...previous.days, ...current.days]) {
      const issue = cellToIssue(
        employee as { id: string; name: string; department: string | null },
        cell
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
