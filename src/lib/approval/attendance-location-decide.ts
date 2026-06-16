import { finalizeAttendanceRecord } from "@/lib/attendance/finalize-attendance-record"
import { formatIctTime } from "@/lib/attendance/late"
import { getAdminClient } from "@/lib/auth/admin-client"
import { coerceLocale } from "@/lib/i18n/types"
import { t } from "@/lib/i18n/translate"
import {
  getApproverDisplayName,
  notifyDecisionParties,
} from "@/lib/line/notify-approval-decision"
import { EMPLOYEE_VIA_ATTENDANCE } from "@/lib/supabase/employee-embeds"

export type AttendanceLocationDecideInput = {
  attendanceId: string
  approverId: string
  action: "approve" | "reject"
  note?: string
}

export type AttendanceLocationDecideResult =
  | { ok: true; status: "approved" | "rejected" }
  | { ok: false; error: string; status: 400 | 404 | 409 }

export async function decideAttendanceLocation(
  input: AttendanceLocationDecideInput
): Promise<AttendanceLocationDecideResult> {
  const note = (input.note ?? "").trim()
  if (input.action === "reject" && note.length < 3) {
    return {
      ok: false,
      error: "กรุณาระบุเหตุผลการปฏิเสธพิกัด",
      status: 400,
    }
  }

  const admin = getAdminClient()
  const { data: row, error: loadError } = await admin
    .from("hr_attendance")
    .select(
      `id, employee_id, shift_date, work_hours, check_in_at, check_out_at, location_review_status, ${EMPLOYEE_VIA_ATTENDANCE}!inner(name, line_user_id, preferred_locale, branch_id)`
    )
    .eq("id", input.attendanceId)
    .maybeSingle()

  if (loadError) {
    return { ok: false, error: loadError.message, status: 400 }
  }
  if (!row) {
    return { ok: false, error: "ไม่พบรายการเข้างาน", status: 404 }
  }

  const currentStatus = (row.location_review_status as string | null) ?? "clear"
  if (currentStatus !== "pending_hr") {
    return {
      ok: false,
      error: "รายการนี้ไม่ได้อยู่ระหว่างรอ HR ตรวจพิกัด",
      status: 409,
    }
  }

  const reviewedAt = new Date().toISOString()
  const updatePayload =
    input.action === "approve"
      ? {
          location_review_status: "approved",
          location_review_note: note || "HR อนุมัติพิกัด",
          location_reviewed_by: input.approverId,
          location_reviewed_at: reviewedAt,
        }
      : {
          location_review_status: "rejected",
          location_review_note: note,
          location_reviewed_by: input.approverId,
          location_reviewed_at: reviewedAt,
        }

  const { error: updateError } = await admin
    .from("hr_attendance")
    .update(updatePayload)
    .eq("id", input.attendanceId)

  if (updateError) {
    return { ok: false, error: updateError.message, status: 400 }
  }

  if (
    input.action === "approve" &&
    row.check_out_at &&
    typeof row.work_hours === "number" &&
    row.work_hours > 0
  ) {
    try {
      await finalizeAttendanceRecord({
        attendanceId: row.id as string,
        employeeId: row.employee_id as string,
        branchId:
          (row.hr_employees as { branch_id?: string | null } | null)?.branch_id ??
          null,
        workDate: (row.shift_date as string | null) ?? undefined,
        workHours: row.work_hours,
      })
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "อนุมัติพิกัดแล้ว แต่ finalize attendance ไม่สำเร็จ"
      return { ok: false, error: message, status: 400 }
    }
  }

  type EmpJoin = {
    name?: string
    line_user_id?: string | null
    preferred_locale?: unknown
    branch_id?: string | null
  }
  const empRaw = row.hr_employees as EmpJoin | EmpJoin[] | null
  const emp = empRaw ? (Array.isArray(empRaw) ? empRaw[0] : empRaw) : null
  const locale = coerceLocale(emp?.preferred_locale)
  const employeeName = emp?.name ?? "พนักงาน"
  const approverName = await getApproverDisplayName(input.approverId)
  const checkInLabel = row.check_in_at
    ? formatIctTime(new Date(row.check_in_at as string))
    : "—"
  const approved = input.action === "approve"

  const employeeText = approved
    ? note
      ? t("line.attendanceReview.employeeApprovedWithNote", locale, { note })
      : t("line.attendanceReview.employeeApproved", locale)
    : t("line.attendanceReview.employeeRejected", locale, { note })

  await notifyDecisionParties({
    employeeLineUserId: emp?.line_user_id,
    employeeMessages: emp?.line_user_id
      ? [{ type: "text", text: employeeText }]
      : undefined,
    hrGroupText: [
      approved ? "✅ อนุมัติพิกัดการเช็คอินแล้ว" : "❌ ปฏิเสธพิกัดการเช็คอิน",
      `พนักงาน: ${employeeName}`,
      `วันที่: ${row.shift_date ?? "—"}`,
      `เวลาเข้า: ${checkInLabel}`,
      note ? `หมายเหตุ: ${note}` : null,
      `โดย: ${approverName}`,
    ]
      .filter(Boolean)
      .join("\n"),
  })

  return {
    ok: true,
    status: input.action === "approve" ? "approved" : "rejected",
  }
}
