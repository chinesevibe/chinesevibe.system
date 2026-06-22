import { getAdminClient } from "@/lib/auth/admin-client"
import { ictDateFromUtc, ictLocalToUtc } from "@/lib/attendance/ict-datetime"

export type AttendanceMonthSummary = {
  workDays: number
  totalHours: number
}

function currentMonthBounds(now: Date) {
  const ictDate = ictDateFromUtc(now)
  const [year, month] = ictDate.split("-").map(Number)
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`
  const nextMonthYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const nextMonthStart = `${nextMonthYear}-${String(nextMonth).padStart(2, "0")}-01`
  return {
    start: ictLocalToUtc(monthStart, "00:00"),
    end: ictLocalToUtc(nextMonthStart, "00:00"),
  }
}

export async function getAttendanceMonthSummary(
  employeeId: string,
  now = new Date()
): Promise<AttendanceMonthSummary> {
  const admin = getAdminClient()
  const { start, end } = currentMonthBounds(now)

  const { data, error } = await admin
    .from("hr_attendance")
    .select("work_hours")
    .eq("employee_id", employeeId)
    .gte("check_in_at", start.toISOString())
    .lt("check_in_at", end.toISOString())

  if (error) throw error

  const rows = (data ?? []) as Array<{ work_hours: number | null }>
  const totalHours = rows.reduce((sum, row) => sum + Number(row.work_hours ?? 0), 0)

  return {
    workDays: rows.length,
    totalHours: Math.round(totalHours * 10) / 10,
  }
}
