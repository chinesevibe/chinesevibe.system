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

  // 1. Branch Night: open record within last 36 h (covers 14:00–02:00 shifts after midnight).
  const window36hStart = new Date(now.getTime() - 36 * 60 * 60 * 1000)
  const { data: openRecord, error: openError } = await admin
    .from("hr_attendance")
    .select("check_in_at")
    .eq("employee_id", employee.id)
    .is("check_out_at", null)
    .gte("check_in_at", window36hStart.toISOString())
    .order("check_in_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (openError) throw openError
  if (openRecord) return { kind: "checked_in", checkInAt: new Date(openRecord.check_in_at) }

  // 2. Any check-in record today (ICT day) — determines checked_in / checked_out state.
  // Filter by check_in_at (not check_out_at) so overnight checkouts (00:07 ICT = prev-day UTC)
  // don't incorrectly land in the next day's window and block re-check-in.
  const { start, end } = ictDayRangeUtc(now)
  const { data: record, error: recordError } = await admin
    .from("hr_attendance")
    .select("check_in_at, check_out_at")
    .eq("employee_id", employee.id)
    .gte("check_in_at", start.toISOString())
    .lt("check_in_at", end.toISOString())
    .order("check_in_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (recordError) throw recordError
  if (!record) return { kind: "none" }
  if (record.check_out_at) {
    const checkOutAt = new Date(record.check_out_at)
    // Overnight shift (e.g. 14:00–02:00): if checked out ≥8 h ago, treat as fresh day
    // so the next shift's check-in is not blocked by the previous shift's same-ICT-day record.
    if (now.getTime() - checkOutAt.getTime() >= 8 * 60 * 60 * 1000) {
      return { kind: "none" }
    }
    return { kind: "checked_out", checkOutAt }
  }
  return { kind: "checked_in", checkInAt: new Date(record.check_in_at) }
}
