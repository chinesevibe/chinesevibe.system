import {
  countLeaveDays,
  LEAVE_TYPE_LABELS,
  type LeaveType,
} from "@/features/leave/types"
import { applyApprovedLeaveAutoCheckout } from "@/lib/approval/leave-attendance"
import { recordPayrollHours } from "@/lib/approval/payroll-ledger"
import { getAdminClient } from "@/lib/auth/admin-client"
import {
  leaveApprovedFlex,
  leaveRejectedFlex,
} from "@/lib/line/flex/leave-result"
import { coerceLocale } from "@/lib/i18n/types"
import {
  getApproverDisplayName,
  notifyDecisionParties,
} from "@/lib/line/notify-approval-decision"

export type LeaveDecideInput = {
  leaveId: string
  approverId: string
  action: "approve" | "reject"
  note?: string
  /** LINE postbacks — only pending_hr */
  hrStepOnly?: boolean
}

export type LeaveDecideResult =
  | { ok: true; status: "approved" | "rejected"; id: string }
  | { ok: false; error: string; status: 400 | 404 | 409 }

export async function decideLeave(
  input: LeaveDecideInput
): Promise<LeaveDecideResult> {
  const note = (input.note ?? "").trim()
  if (input.action === "reject" && note.length < 3) {
    return { ok: false, error: "reject reason required", status: 400 }
  }

  const admin = getAdminClient()
  const { data: leave, error: fetchError } = await admin
    .from("hr_leaves")
    .select(
      "id, employee_id, type, start_date, end_date, reason, status, approval_status, leave_unit, leave_hours, hr_employees!employee_id(line_user_id, name, department, branch_id, preferred_locale)"
    )
    .eq("id", input.leaveId)
    .maybeSingle()

  if (fetchError) {
    return { ok: false, error: fetchError.message, status: 400 }
  }
  if (!leave) {
    return { ok: false, error: "not found", status: 404 }
  }
  if (leave.approval_status === "expired") {
    return { ok: false, error: "คำขอหมดอายุแล้ว", status: 400 }
  }

  if (input.hrStepOnly && leave.approval_status !== "pending_hr") {
    return {
      ok: false,
      error:
        leave.approval_status === "pending_manager"
          ? "รอหัวหน้างานอนุมัติบน Web ก่อน"
          : "already decided",
      status: 409,
    }
  }

  if (leave.approval_status !== "pending_hr" && leave.approval_status !== "pending_manager") {
    return { ok: false, error: "already decided", status: 409 }
  }

  const stage = leave.approval_status === "pending_manager" ? "manager" : "hr"
  const decisionAt = new Date()

  const employeeJoin = Array.isArray(leave.hr_employees)
    ? leave.hr_employees[0]
    : leave.hr_employees
  const lineUserId = employeeJoin?.line_user_id as string | null | undefined
  const employeeName = (employeeJoin?.name as string | undefined) ?? "พนักงาน"
  const branchId = (employeeJoin as { branch_id?: string })?.branch_id ?? null
  const locale = coerceLocale(
    (employeeJoin as { preferred_locale?: unknown })?.preferred_locale
  )
  const leaveType = leave.type as LeaveType
  const days = countLeaveDays(leave.start_date, leave.end_date) ?? 0
  const id = input.leaveId

  if (input.action === "reject") {
    const patch =
      stage === "manager"
        ? {
            approval_status: "rejected",
            status: "rejected",
            manager_decided_by: input.approverId,
            manager_decided_at: new Date().toISOString(),
            decision_note: note,
          }
        : {
            approval_status: "rejected",
            status: "rejected",
            hr_decided_by: input.approverId,
            hr_decided_at: new Date().toISOString(),
            decision_note: note,
          }

    const { error } = await admin.from("hr_leaves").update(patch).eq("id", id)

    if (error) {
      return { ok: false, error: error.message, status: 400 }
    }

    const approverName = await getApproverDisplayName(input.approverId)
    const leaveLabel = LEAVE_TYPE_LABELS[leaveType] ?? leaveType
    await notifyDecisionParties({
      employeeLineUserId: lineUserId,
      employeeMessages: [
        leaveRejectedFlex({
          type: leaveType,
          startDate: leave.start_date,
          endDate: leave.end_date,
          reason: note,
          locale,
        }),
      ],
      hrGroupText: [
        "❌ ปฏิเสธคำขอลา",
        `พนักงาน: ${employeeName}`,
        `ประเภท: ${leaveLabel}`,
        `วันที่: ${leave.start_date} – ${leave.end_date}`,
        `เหตุผล: ${note}`,
        `โดย: ${approverName}`,
      ].join("\n"),
    })

    return { ok: true, status: "rejected", id }
  }

  const { error: updateError } = await admin
    .from("hr_leaves")
    .update({
      status: "approved",
      approval_status: "approved",
      approved_by: input.approverId,
      hr_decided_by: input.approverId,
      hr_decided_at: decisionAt.toISOString(),
      decision_note: note || null,
    })
    .eq("id", id)

  if (updateError) {
    return { ok: false, error: updateError.message, status: 400 }
  }

  const autoCheckout = await applyApprovedLeaveAutoCheckout({
    leaveId: id,
    employeeId: leave.employee_id as string,
    approverId: input.approverId,
    startDate: leave.start_date as string,
    endDate: leave.end_date as string,
    leaveUnit: (leave.leave_unit as string | null | undefined) ?? null,
    note: note || null,
    approvalTime: decisionAt,
  })

  if (leave.leave_unit === "days" && days > 0) {
    const { data: balance } = await admin
      .from("hr_leave_balances")
      .select("used_days, total_days")
      .eq("employee_id", leave.employee_id)
      .eq("leave_type", leave.type)
      .maybeSingle()

    if (balance) {
      const nextUsed = Number(balance.used_days) + days
      await admin
        .from("hr_leave_balances")
        .update({ used_days: nextUsed })
        .eq("employee_id", leave.employee_id)
        .eq("leave_type", leave.type)
    }
  }

  if (leave.leave_unit === "hours" && leave.leave_hours) {
    await recordPayrollHours({
      employeeId: leave.employee_id as string,
      branchId,
      workDate: leave.start_date as string,
      hours: Number(leave.leave_hours),
      lineType: "sick_hourly",
      sourceType: "leave",
      sourceId: id,
    })
  }

  let remainingDays: number | null = null
  if (leave.leave_unit === "days" && days > 0) {
    const { data: balance } = await admin
      .from("hr_leave_balances")
      .select("used_days, total_days")
      .eq("employee_id", leave.employee_id)
      .eq("leave_type", leave.type)
      .maybeSingle()
    if (balance) {
      remainingDays =
        Number(balance.total_days) - Number(balance.used_days)
    }
  }

  const approverName = await getApproverDisplayName(input.approverId)
  const leaveLabel = LEAVE_TYPE_LABELS[leaveType] ?? leaveType
  const employeeNote = [note, autoCheckout.status !== "not_applicable" ? autoCheckout.note : null]
    .filter(Boolean)
    .join("\n")
  await notifyDecisionParties({
    employeeLineUserId: lineUserId,
    employeeMessages: [
      leaveApprovedFlex({
        type: leaveType,
        startDate: leave.start_date,
        endDate: leave.end_date,
        remainingDays,
        note: employeeNote || null,
        locale,
      }),
    ],
    hrGroupText: [
      "✅ อนุมัติคำขอลาแล้ว",
      `พนักงาน: ${employeeName}`,
      `ประเภท: ${leaveLabel}`,
      `วันที่: ${leave.start_date} – ${leave.end_date}`,
      note ? `หมายเหตุ: ${note}` : null,
      autoCheckout.status !== "not_applicable"
        ? `Attendance: ${autoCheckout.note}`
        : null,
      `โดย: ${approverName}`,
    ]
      .filter(Boolean)
      .join("\n"),
  })

  return { ok: true, status: "approved", id }
}
