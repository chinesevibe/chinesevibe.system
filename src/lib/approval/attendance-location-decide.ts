import { finalizeAttendanceRecord } from "@/lib/attendance/finalize-attendance-record"
import { getAdminClient } from "@/lib/auth/admin-client"
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
      `id, employee_id, shift_date, work_hours, check_out_at, location_review_status, ${EMPLOYEE_VIA_ATTENDANCE}!inner(branch_id)`
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

  return {
    ok: true,
    status: input.action === "approve" ? "approved" : "rejected",
  }
}
