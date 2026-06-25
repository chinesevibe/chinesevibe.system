import { getAdminClient } from "@/lib/auth/admin-client"
import {
  autoCloseOpenAttendanceSessions,
  isMissingCheckoutRecord,
  isRecheckinBlockedAfterCheckout,
  isCheckoutStillInActiveCycle,
  sessionCycleStartUtc,
} from "@/lib/attendance/session-cycle"

export type LineTodayAttendanceState =
  | { kind: "not_registered" }
  | { kind: "none" }
  | { kind: "checked_in"; checkInAt: Date }
  | { kind: "checked_out"; checkOutAt: Date }

/** Current session state for a LINE user — pure session model, 24h rolling window. */
export async function getLineTodayAttendanceState(
  lineUserId: string,
  now = new Date()
): Promise<LineTodayAttendanceState> {
  const admin = getAdminClient()

  const { data: employee, error: employeeError } = await admin
    .from("hr_employees")
    .select("id, default_check_in_time")
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
    .select("check_in_at, location_review_flags")
    .eq("employee_id", employee.id)
    .is("check_out_at", null)
    .order("check_in_at", { ascending: false })
    .limit(5)

  if (openError) throw openError
  const activeOpenRecord = (openRecord ?? []).find(
    (record) =>
      !isMissingCheckoutRecord(record.location_review_flags as string[] | null | undefined)
  )
  if (activeOpenRecord) {
    return { kind: "checked_in", checkInAt: new Date(activeOpenRecord.check_in_at) }
  }

  const cycleStart = sessionCycleStartUtc(now)
  const { data: record, error: recordError } = await admin
    .from("hr_attendance")
    .select("check_in_at, check_out_at, location_review_flags")
    .eq("employee_id", employee.id)
    .gte("check_in_at", cycleStart.toISOString())
    .lte("check_in_at", now.toISOString())
    .order("check_in_at", { ascending: false })
    .limit(5)

  if (recordError) throw recordError
  const recentRecord =
    (record ?? []).find(
      (row) =>
        !isMissingCheckoutRecord(row.location_review_flags as string[] | null | undefined)
    ) ?? null
  if (!recentRecord) return { kind: "none" }
  if (recentRecord.check_out_at) {
    const checkOutAt = new Date(recentRecord.check_out_at)
    if (isRecheckinBlockedAfterCheckout(checkOutAt, now)) {
      return { kind: "checked_out", checkOutAt }
    }
    if (!isCheckoutStillInActiveCycle(checkOutAt, now)) {
      return { kind: "none" }
    }
    return { kind: "checked_out", checkOutAt }
  }
  return { kind: "checked_in", checkInAt: new Date(recentRecord.check_in_at) }
}
