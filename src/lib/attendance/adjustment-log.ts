import { getAdminClient } from "@/lib/auth/admin-client"

export type AttendanceAdjustmentAction =
  | "employee_manual_create"
  | "employee_manual_update"
  | "hr_create"
  | "hr_update"
  | "hr_delete"
  | "approved_hourly_leave_checkout"

export type AttendanceAdjustmentSource =
  | "employee_manual"
  | "hr_manual"
  | "leave_approval"

export type AttendanceAuditSnapshot = {
  id?: string | null
  employee_id?: string | null
  work_shift_id?: string | null
  shift_date?: string | null
  check_in_at?: string | null
  check_out_at?: string | null
  work_hours?: number | null
  is_late?: boolean | null
  check_in_location?: unknown
  check_out_location?: unknown
  location_review_status?: string | null
}

export function toAttendanceAuditSnapshot(
  row: Record<string, unknown> | null | undefined
): AttendanceAuditSnapshot | null {
  if (!row) return null
  return {
    id: (row.id as string | null | undefined) ?? null,
    employee_id: (row.employee_id as string | null | undefined) ?? null,
    work_shift_id: (row.work_shift_id as string | null | undefined) ?? null,
    shift_date: (row.shift_date as string | null | undefined) ?? null,
    check_in_at: (row.check_in_at as string | null | undefined) ?? null,
    check_out_at: (row.check_out_at as string | null | undefined) ?? null,
    work_hours:
      row.work_hours == null ? null : Number(row.work_hours),
    is_late: row.is_late == null ? null : Boolean(row.is_late),
    check_in_location: row.check_in_location ?? null,
    check_out_location: row.check_out_location ?? null,
    location_review_status:
      (row.location_review_status as string | null | undefined) ?? null,
  }
}

export async function recordAttendanceAdjustment(input: {
  attendanceId?: string | null
  leaveId?: string | null
  actorEmployeeId?: string | null
  action: AttendanceAdjustmentAction
  source: AttendanceAdjustmentSource
  reason?: string | null
  before: AttendanceAuditSnapshot | null
  after: AttendanceAuditSnapshot | null
  metadata?: Record<string, unknown>
}) {
  const admin = getAdminClient()
  const { error } = await admin.from("hr_attendance_adjustments").insert({
    attendance_id: input.attendanceId ?? null,
    leave_id: input.leaveId ?? null,
    actor_employee_id: input.actorEmployeeId ?? null,
    action: input.action,
    source: input.source,
    reason: input.reason?.trim() ? input.reason.trim() : null,
    before_snapshot: input.before,
    after_snapshot: input.after,
    metadata: input.metadata ?? {},
  })

  if (error) {
    console.error("recordAttendanceAdjustment failed:", error)
  }
}
