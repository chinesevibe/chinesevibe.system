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

  // 2. Already checked-out today (ICT day).
  const { start, end } = ictDayRangeUtc(now)
  const { data: checkedOutRecord, error: checkedOutError } = await admin
    .from("hr_attendance")
    .select("check_out_at")
    .eq("employee_id", employee.id)
    .not("check_out_at", "is", null)
    .gte("check_out_at", start.toISOString())
    .lt("check_out_at", end.toISOString())
    .order("check_out_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (checkedOutError) throw checkedOutError
  if (checkedOutRecord?.check_out_at) {
    return { kind: "checked_out", checkOutAt: new Date(checkedOutRecord.check_out_at) }
  }

  // 3. Fallback: any check-in record today (handles edge cases / same-day without open record).
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
    return { kind: "checked_out", checkOutAt: new Date(record.check_out_at) }
  }
  return { kind: "checked_in", checkInAt: new Date(record.check_in_at) }
}
