import { expiresAtFrom } from "@/lib/approval/types"
import { finalizeAttendanceRecord } from "@/lib/attendance/finalize-attendance-record"
import { ictDayRangeUtc } from "@/lib/attendance/late"
import { getAdminClient } from "@/lib/auth/admin-client"
import { ictToday } from "@/lib/datetime/thailand"

export type SubmitDailyResult =
  | { status: "success"; expiresAt: string; employeeId: string; employeeName: string }
  | { status: "not_checked_in" }
  | { status: "not_checked_out" }
  | { status: "already_submitted" }
  | { status: "pending_approval" }
  | { status: "not_registered" }

export async function submitDailyAttendance({
  lineUserId,
  now = new Date(),
}: {
  lineUserId: string
  now?: Date
}): Promise<SubmitDailyResult> {
  const admin = getAdminClient()

  const { data: row } = await admin
    .from("hr_employees")
    .select("id, name, status, branch_id")
    .eq("line_user_id", lineUserId)
    .maybeSingle()

  if (!row) return { status: "not_registered" }
  if (row.status !== "active") return { status: "pending_approval" }
  const employee = row

  const { start, end } = ictDayRangeUtc(now)
  const { data: attendance } = await admin
    .from("hr_attendance")
    .select("id, check_out_at, work_hours")
    .eq("employee_id", employee.id)
    .gte("check_in_at", start.toISOString())
    .lt("check_in_at", end.toISOString())
    .maybeSingle()

  if (!attendance) return { status: "not_checked_in" }
  if (!attendance.check_out_at) return { status: "not_checked_out" }

  const workHours = Number(attendance.work_hours ?? 0)
  const workDate = ictToday()
  const expiresAt = expiresAtFrom(now)

  const result = await finalizeAttendanceRecord({
    attendanceId: attendance.id as string,
    employeeId: employee.id as string,
    branchId: (employee.branch_id as string | null) ?? null,
    workDate,
    workHours,
    now,
  })

  if (result.status === "already_approved") {
    return { status: "already_submitted" }
  }
  if (result.status === "pending_location_review") {
    return { status: "pending_approval" }
  }

  return {
    status: "success",
    expiresAt: expiresAt.toISOString(),
    employeeId: employee.id as string,
    employeeName: employee.name as string,
  }
}
