import {
  recordAttendanceAdjustment,
  toAttendanceAuditSnapshot,
} from "@/lib/attendance/adjustment-log"
import { finalizeAttendanceRecord } from "@/lib/attendance/finalize-attendance-record"
import { ictDateFromUtc } from "@/lib/attendance/ict-datetime"
import { formatIctTime } from "@/lib/attendance/late"
import { computePaidWorkMinutes } from "@/lib/attendance/paid-work-time"
import { getAdminClient } from "@/lib/auth/admin-client"
import { resolveRegularWorkHours } from "@/lib/payroll/hour-policy"

const OPEN_ATTENDANCE_SELECT =
  "id, employee_id, work_shift_id, shift_date, check_in_at, check_out_at, work_hours, is_late, check_in_location, check_out_location, location_review_status"

async function safeUpdateLeaveAutoCheckoutMeta(input: {
  leaveId: string
  attendanceId?: string | null
  checkoutAt?: string | null
  note: string
}) {
  const admin = getAdminClient()
  const { error } = await admin
    .from("hr_leaves")
    .update({
      attendance_auto_checkout_id: input.attendanceId ?? null,
      attendance_auto_checkout_at: input.checkoutAt ?? null,
      attendance_auto_checkout_note: input.note,
    })
    .eq("id", input.leaveId)

  if (error) {
    console.error("safeUpdateLeaveAutoCheckoutMeta failed:", error)
  }
}

export function shouldAutoCheckoutApprovedLeave(params: {
  leaveUnit: string | null | undefined
  startDate: string
  endDate: string
  approvalTime: Date
}) {
  return (
    params.leaveUnit === "hours" &&
    params.startDate === params.endDate &&
    params.startDate === ictDateFromUtc(params.approvalTime)
  )
}

export type LeaveAutoCheckoutResult =
  | { status: "not_applicable" }
  | { status: "applied"; attendanceId: string; checkoutAt: string; note: string }
  | { status: "skipped"; note: string }

export async function applyApprovedLeaveAutoCheckout(input: {
  leaveId: string
  employeeId: string
  approverId: string
  startDate: string
  endDate: string
  leaveUnit: string | null | undefined
  note?: string | null
  approvalTime?: Date
}): Promise<LeaveAutoCheckoutResult> {
  const approvalTime = input.approvalTime ?? new Date()
  if (
    !shouldAutoCheckoutApprovedLeave({
      leaveUnit: input.leaveUnit,
      startDate: input.startDate,
      endDate: input.endDate,
      approvalTime,
    })
  ) {
    return { status: "not_applicable" }
  }

  const admin = getAdminClient()
  const { data: employee, error: employeeError } = await admin
    .from("hr_employees")
    .select("id, branch_id, pay_type")
    .eq("id", input.employeeId)
    .maybeSingle()

  if (employeeError) throw employeeError
  if (!employee) {
    return { status: "skipped", note: "ไม่พบข้อมูลพนักงาน จึงไม่ได้เช็คเอาท์อัตโนมัติ" }
  }

  const { data: openAttendance, error: attendanceError } = await admin
    .from("hr_attendance")
    .select(OPEN_ATTENDANCE_SELECT)
    .eq("employee_id", input.employeeId)
    .is("check_out_at", null)
    .lte("check_in_at", approvalTime.toISOString())
    .order("check_in_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (attendanceError) throw attendanceError

  if (!openAttendance) {
    const note = "อนุมัติการลาแล้ว แต่ไม่พบรอบเข้างานที่ยังเปิดอยู่ จึงไม่ได้เช็คเอาท์อัตโนมัติ"
    await safeUpdateLeaveAutoCheckoutMeta({
      leaveId: input.leaveId,
      note,
    })
    return { status: "skipped", note }
  }

  const checkInAt = new Date(openAttendance.check_in_at as string)
  const workDate =
    (openAttendance.shift_date as string | null) ?? ictDateFromUtc(checkInAt)
  const paidResult = computePaidWorkMinutes({
    checkInAt,
    checkOutAt: approvalTime,
    shift: null,
  })
  const workHours = resolveRegularWorkHours(
    (employee.pay_type as string | null) ?? null,
    paidResult.paidHours
  )

  const { data: updatedRows, error: updateError } = await admin
    .from("hr_attendance")
    .update({
      check_out_at: approvalTime.toISOString(),
      work_hours: workHours,
    })
    .eq("id", openAttendance.id)
    .is("check_out_at", null)
    .select(OPEN_ATTENDANCE_SELECT)

  if (updateError) throw updateError

  const updated = updatedRows?.[0]
  if (!updated) {
    const note = "อนุมัติการลาแล้ว แต่รอบเข้างานถูกปิดไปก่อนหน้า จึงไม่ได้เช็คเอาท์อัตโนมัติซ้ำ"
    await safeUpdateLeaveAutoCheckoutMeta({
      leaveId: input.leaveId,
      note,
    })
    return { status: "skipped", note }
  }

  await finalizeAttendanceRecord({
    attendanceId: updated.id as string,
    employeeId: input.employeeId,
    branchId: (employee.branch_id as string | null) ?? null,
    workDate,
    workHours: workHours ?? 0,
    payType: (employee.pay_type as string | null) ?? null,
    now: approvalTime,
  })

  const note = `ระบบเช็คเอาท์ให้อัตโนมัติตอน ${formatIctTime(approvalTime)} ตามเวลาที่ HR อนุมัติ`

  await safeUpdateLeaveAutoCheckoutMeta({
    leaveId: input.leaveId,
    attendanceId: updated.id as string,
    checkoutAt: approvalTime.toISOString(),
    note,
  })

  await recordAttendanceAdjustment({
    attendanceId: updated.id as string,
    leaveId: input.leaveId,
    actorEmployeeId: input.approverId,
    action: "approved_hourly_leave_checkout",
    source: "leave_approval",
    reason: input.note ?? "Approved same-day hourly leave triggered auto check-out",
    before: toAttendanceAuditSnapshot(openAttendance as Record<string, unknown>),
    after: toAttendanceAuditSnapshot(updated as Record<string, unknown>),
    metadata: {
      leave_unit: input.leaveUnit,
      start_date: input.startDate,
      end_date: input.endDate,
      approval_time: approvalTime.toISOString(),
    },
  })

  return {
    status: "applied",
    attendanceId: updated.id as string,
    checkoutAt: approvalTime.toISOString(),
    note,
  }
}
