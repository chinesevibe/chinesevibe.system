import { recordPayrollHours } from "@/lib/approval/payroll-ledger"
import { getAdminClient } from "@/lib/auth/admin-client"
import { coerceLocale } from "@/lib/i18n/types"
import { roundPayrollHours } from "@/lib/payroll/hour-policy"
import { overtimeResultFlex } from "@/lib/line/flex/overtime-request"
import {
  getApproverDisplayName,
  notifyDecisionParties,
} from "@/lib/line/notify-approval-decision"

export type OvertimeDecideInput = {
  otId: string
  approverId: string
  action: "approve" | "reject"
  note?: string
  hrStepOnly?: boolean
}

export type OvertimeDecideResult =
  | { ok: true; status: "approved" | "rejected"; id: string }
  | { ok: false; error: string; status: 400 | 404 | 409 }

function otHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number)
  const [eh, em] = endTime.split(":").map(Number)
  return roundPayrollHours(Math.max(0, eh + em / 60 - (sh + sm / 60)))
}

export async function decideOvertime(
  input: OvertimeDecideInput
): Promise<OvertimeDecideResult> {
  const note = (input.note ?? "").trim()
  if (input.action === "reject" && note.length < 3) {
    return { ok: false, error: "reject reason required", status: 400 }
  }

  const admin = getAdminClient()
  const { data: ot, error: fetchError } = await admin
    .from("hr_overtime_requests")
    .select(
      "id, work_date, start_time, end_time, reason, status, approval_status, employee_id, hr_employees!employee_id(line_user_id, name, branch_id, department, preferred_locale)"
    )
    .eq("id", input.otId)
    .maybeSingle()

  if (fetchError) {
    return { ok: false, error: fetchError.message, status: 400 }
  }
  if (!ot) {
    return { ok: false, error: "not found", status: 404 }
  }
  if (ot.approval_status === "expired") {
    return { ok: false, error: "คำขอหมดอายุแล้ว", status: 400 }
  }

  if (input.hrStepOnly && ot.approval_status !== "pending_hr") {
    return {
      ok: false,
      error:
        ot.approval_status === "pending_manager"
          ? "รอหัวหน้างานอนุมัติบน Web ก่อน"
          : "already decided",
      status: 409,
    }
  }

  if (
    ot.approval_status !== "pending_hr" &&
    ot.approval_status !== "pending_manager"
  ) {
    return { ok: false, error: "already decided", status: 409 }
  }

  const stage = ot.approval_status === "pending_manager" ? "manager" : "hr"

  type Emp = {
    line_user_id: string | null
    name: string
    branch_id: string | null
    preferred_locale?: unknown
  }
  const empRaw = ot.hr_employees as Emp | Emp[]
  const emp = Array.isArray(empRaw) ? empRaw[0] : empRaw
  const lineUserId = emp?.line_user_id
  const employeeName = emp?.name ?? "พนักงาน"
  const branchId = emp?.branch_id ?? null
  const locale = coerceLocale(emp?.preferred_locale)
  const id = input.otId

  const notifyParties = async (approved: boolean) => {
    const approverName = await getApproverDisplayName(input.approverId)
    const timeRange = `${ot.start_time} – ${ot.end_time}`
    await notifyDecisionParties({
      employeeLineUserId: lineUserId,
      employeeMessages: [
        overtimeResultFlex({
          workDate: ot.work_date as string,
          approved,
          note: note || undefined,
          locale,
        }),
      ],
      hrGroupText: [
        approved ? "✅ อนุมัติ OT แล้ว" : "❌ ปฏิเสธ OT",
        `พนักงาน: ${employeeName}`,
        `วันที่: ${ot.work_date}`,
        `เวลา: ${timeRange}`,
        note
          ? approved
            ? `หมายเหตุ: ${note}`
            : `เหตุผล: ${note}`
          : null,
        `โดย: ${approverName}`,
      ]
        .filter(Boolean)
        .join("\n"),
    })
  }

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

    const { error } = await admin
      .from("hr_overtime_requests")
      .update(patch)
      .eq("id", id)

    if (error) {
      return { ok: false, error: error.message, status: 400 }
    }

    await notifyParties(false)
    return { ok: true, status: "rejected", id }
  }

  const { error: updateError } = await admin
    .from("hr_overtime_requests")
    .update({
      status: "approved",
      approval_status: "approved",
      decision_note: note || null,
      hr_decided_by: input.approverId,
      hr_decided_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (updateError) {
    return { ok: false, error: updateError.message, status: 400 }
  }

  const hours = otHours(String(ot.start_time), String(ot.end_time))
  await recordPayrollHours({
    employeeId: ot.employee_id as string,
    branchId,
    workDate: ot.work_date as string,
    hours,
    lineType: "overtime",
    sourceType: "overtime",
    sourceId: id,
  })

  await notifyParties(true)
  return { ok: true, status: "approved", id }
}
