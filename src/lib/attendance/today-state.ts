import { getAdminClient } from "@/lib/auth/admin-client"
import { ictDayRangeUtc } from "@/lib/attendance/late"

export type LineTodayAttendanceState =
  | { kind: "not_registered" }
  | { kind: "none" }
  | { kind: "checked_in"; checkInAt: Date }
  | { kind: "checked_out"; checkOutAt: Date }

/** Today's attendance for a LINE user — used to route location messages. */
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

  const { start, end } = ictDayRangeUtc(now)
  const { data: record, error: recordError } = await admin
    .from("hr_attendance")
    .select("check_in_at, check_out_at")
    .eq("employee_id", employee.id)
    .gte("check_in_at", start.toISOString())
    .lt("check_in_at", end.toISOString())
    .maybeSingle()

  if (recordError) throw recordError
  if (!record) return { kind: "none" }
  if (record.check_out_at) {
    return { kind: "checked_out", checkOutAt: new Date(record.check_out_at) }
  }
  return { kind: "checked_in", checkInAt: new Date(record.check_in_at) }
}
