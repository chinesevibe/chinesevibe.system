import { getAdminClient } from "@/lib/auth/admin-client"
import { ictDateFromUtc, ictLocalToUtc } from "@/lib/attendance/ict-datetime"

export type AttendanceMonthSummary = {
  workDays: number
  totalHours: number
  otDays?: number  // monthly only: จำนวนวันที่มี OT approved
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
    monthStart,
    nextMonthStart,
  }
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

/**
 * monthly employees: query วันทำงานจริงแยกจาก OT approved
 */
async function getMonthlyOtSummary(
  employeeId: string,
  start: Date,
  end: Date,
  monthStart: string,
  nextMonthStart: string
): Promise<AttendanceMonthSummary> {
  const admin = getAdminClient()

  // วันทำงานจริง (check-in)
  const { data: attData, error: attError } = await admin
    .from("hr_attendance")
    .select("id")
    .eq("employee_id", employeeId)
    .gte("check_in_at", start.toISOString())
    .lt("check_in_at", end.toISOString())

  if (attError) throw attError

  // OT ที่ HR อนุมัติ
  const { data: otData, error: otError } = await admin
    .from("hr_overtime_requests")
    .select("work_date, start_time, end_time")
    .eq("employee_id", employeeId)
    .eq("approval_status", "approved")
    .gte("work_date", monthStart)
    .lt("work_date", nextMonthStart)

  if (otError) throw otError

  const otRows = (otData ?? []) as Array<{
    work_date: string
    start_time: string
    end_time: string
  }>

  const totalHours = otRows.reduce((sum, row) => {
    const startMin = parseTimeToMinutes(row.start_time)
    const endMin = parseTimeToMinutes(row.end_time)
    return sum + Math.max(0, (endMin - startMin) / 60)
  }, 0)

  return {
    workDays: (attData ?? []).length,
    totalHours: Math.round(totalHours * 10) / 10,
    otDays: otRows.length,
  }
}

export async function getAttendanceMonthSummary(
  employeeId: string,
  now = new Date(),
  payType?: string | null
): Promise<AttendanceMonthSummary> {
  const { start, end, monthStart, nextMonthStart } = currentMonthBounds(now)

  // monthly (เงินเดือน): วันทำงานจริง + OT approved แยกกัน
  if (payType === "monthly") {
    return getMonthlyOtSummary(employeeId, start, end, monthStart, nextMonthStart)
  }

  // hourly (รายชั่วโมง): นับจาก work_hours ใน hr_attendance
  const admin = getAdminClient()
  const { data, error } = await admin
    .from("hr_attendance")
    .select("work_hours")
    .eq("employee_id", employeeId)
    .gte("check_in_at", start.toISOString())
    .lt("check_in_at", end.toISOString())

  if (error) throw error

  const MAX_HOURS_PER_DAY = 12
  const rows = (data ?? []) as Array<{ work_hours: number | null }>
  const totalHours = rows.reduce(
    (sum, row) => sum + Math.min(Number(row.work_hours ?? 0), MAX_HOURS_PER_DAY),
    0
  )

  return {
    workDays: rows.length,
    totalHours: Math.round(totalHours * 10) / 10,
  }
}
