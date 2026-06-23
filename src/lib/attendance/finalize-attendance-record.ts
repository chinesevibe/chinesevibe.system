import { expiresAtFrom } from "@/lib/approval/types"
import { recordPayrollHours } from "@/lib/approval/payroll-ledger"
import { getAdminClient } from "@/lib/auth/admin-client"
import { ictToday } from "@/lib/datetime/thailand"
import { shouldTrackRegularWorkHours } from "@/lib/payroll/hour-policy"

export type FinalizeAttendanceResult =
  | { status: "finalized"; submissionId: string }
  | { status: "already_approved"; submissionId: string }
  | { status: "pending_location_review" }

export async function finalizeAttendanceRecord({
  attendanceId,
  employeeId,
  branchId,
  workDate,
  workHours,
  payType,
  now = new Date(),
}: {
  attendanceId: string
  employeeId: string
  branchId: string | null
  workDate?: string
  workHours: number
  payType?: string | null
  now?: Date
}): Promise<FinalizeAttendanceResult> {
  const admin = getAdminClient()
  const date = workDate ?? ictToday()
  let resolvedPayType = payType ?? null

  const { data: attendance, error: attendanceError } = await admin
    .from("hr_attendance")
    .select("location_review_status")
    .eq("id", attendanceId)
    .maybeSingle()

  if (attendanceError) throw attendanceError

  if (
    attendance &&
    ["pending_hr", "rejected"].includes(
      (attendance.location_review_status as string | null) ?? "clear"
    )
  ) {
    return { status: "pending_location_review" }
  }

  const { data: existing, error: fetchError } = await admin
    .from("hr_attendance_submissions")
    .select("id, approval_status")
    .eq("attendance_id", attendanceId)
    .maybeSingle()

  if (fetchError) throw fetchError

  if (existing?.approval_status === "approved") {
    return { status: "already_approved", submissionId: existing.id as string }
  }

  const submittedAt = now
  const expiresAt = expiresAtFrom(submittedAt)

  const { data: upserted, error } = await admin
    .from("hr_attendance_submissions")
    .upsert(
      {
        attendance_id: attendanceId,
        employee_id: employeeId,
        work_date: date,
        submitted_at: submittedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        approval_status: "approved",
        manager_decided_by: null,
        manager_decided_at: null,
        hr_decided_by: null,
        hr_decided_at: now.toISOString(),
        decision_note: null,
      },
      { onConflict: "attendance_id" }
    )
    .select("id")
    .single()

  if (error) throw error

  const submissionId = upserted.id as string

  if (resolvedPayType == null) {
    const { data: employee, error: employeeError } = await admin
      .from("hr_employees")
      .select("pay_type")
      .eq("id", employeeId)
      .maybeSingle()

    if (employeeError) throw employeeError
    resolvedPayType = (employee?.pay_type as string | null) ?? null
  }

  if (workHours > 0 && shouldTrackRegularWorkHours(resolvedPayType)) {
    await recordPayrollHours({
      employeeId,
      branchId,
      workDate: date,
      hours: workHours,
      lineType: "regular",
      sourceType: "attendance",
      sourceId: submissionId,
    })
  }

  return { status: "finalized", submissionId }
}
