import { getAdminClient } from "@/lib/auth/admin-client"
import {
  autoCloseOpenAttendanceSessions,
  isCheckoutStillInActiveCycle,
  sessionCycleStartUtc,
} from "@/lib/attendance/session-cycle"

export type LineTodayAttendanceState =
  | { kind: "not_registered" }
  | { kind: "none" }
  | { kind: "checked_in"; checkInAt: Date }
  | { kind: "checked_out"; checkOutAt: Date }

/** Current session state for a LINE user, based on the global 06:00 ICT cycle. */
export async function getLineTodayAttendanceState(
  lineUserId: string,
  now = new Date()
): Promise<LineTodayAttendanceState> {
  const admin = getAdminClient()

  const { data: employee, error: employeeError } = await admin
    .from("hr_employees")
    .select("id")
    .eq("line_user_id", lineUserId)
    .maybeSingle()

  if (employeeError) throw employeeError
  if (!employee) return { kind: "not_registered" }

  await autoCloseOpenAttendanceSessions({
    admin,
    employeeId: employee.id as string,
    now,
  })

  const { data: openRecord, error: openError } = await admin
    .from("hr_attendance")
    .select("check_in_at")
    .eq("employee_id", employee.id)
    .is("check_out_at", null)
    .order("check_in_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (openError) throw openError
  if (openRecord) {
    return { kind: "checked_in", checkInAt: new Date(openRecord.check_in_at) }
  }

  const cycleStart = sessionCycleStartUtc(now)
  const { data: record, error: recordError } = await admin
    .from("hr_attendance")
    .select("check_in_at, check_out_at")
    .eq("employee_id", employee.id)
    .gte("check_in_at", cycleStart.toISOString())
    .lte("check_in_at", now.toISOString())
    .order("check_in_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (recordError) throw recordError
  if (!record) return { kind: "none" }
  if (record.check_out_at) {
    const checkOutAt = new Date(record.check_out_at)
    if (!isCheckoutStillInActiveCycle(checkOutAt, now)) {
      return { kind: "none" }
    }
    return { kind: "checked_out", checkOutAt }
  }
  return { kind: "checked_in", checkInAt: new Date(record.check_in_at) }
}
