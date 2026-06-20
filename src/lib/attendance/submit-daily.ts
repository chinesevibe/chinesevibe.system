import { expiresAtFrom } from "@/lib/approval/types"
import { finalizeAttendanceRecord } from "@/lib/attendance/finalize-attendance-record"
import {
  autoCloseOpenAttendanceSessions,
  sessionCycleStartUtc,
} from "@/lib/attendance/session-cycle"
import { getAdminClient } from "@/lib/auth/admin-client"
import { ictDateFromUtc } from "@/lib/attendance/ict-datetime"

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

  await autoCloseOpenAttendanceSessions({
    admin,
    employeeId: employee.id as string,
    now,
  })

  const cycleStart = sessionCycleStartUtc(now)
  const { data: attendance } = await admin
    .from("hr_attendance")
    .select("id, check_in_at, check_out_at, work_hours")
    .eq("employee_id", employee.id)
    .gte("check_in_at", cycleStart.toISOString())
    .lte("check_in_at", now.toISOString())
    .order("check_in_at", { ascending: false })
    .maybeSingle()

  if (!attendance) return { status: "not_checked_in" }
  if (!attendance.check_out_at) return { status: "not_checked_out" }

  const workHours = Number(attendance.work_hours ?? 0)
  const workDate = ictDateFromUtc(new Date(attendance.check_in_at as string))
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
