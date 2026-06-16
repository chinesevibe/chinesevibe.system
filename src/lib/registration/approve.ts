import { getAdminClient } from "@/lib/auth/admin-client"
import {
  getApproverDisplayName,
  notifyDecisionParties,
} from "@/lib/line/notify-approval-decision"

export { assertHrLineApprover } from "@/lib/line/approval/approver"

export type RegistrationDecisionResult =
  | { ok: true; employeeName: string; lineUserId: string | null }
  | { ok: false; error: string; status: 403 | 404 | 400 }

export async function approveEmployeeRegistration(
  employeeId: string,
  approverId?: string
): Promise<RegistrationDecisionResult> {
  const admin = getAdminClient()

  const { data: row, error: fetchErr } = await admin
    .from("hr_employees")
    .select("id, name, line_user_id, status, role")
    .eq("id", employeeId)
    .maybeSingle()

  if (fetchErr) {
    return { ok: false, error: fetchErr.message, status: 400 }
  }
  if (!row) {
    return { ok: false, error: "not found", status: 404 }
  }
  if (row.role !== "employee") {
    return { ok: false, error: "invalid role", status: 400 }
  }
  if (row.status === "active") {
    return {
      ok: true,
      employeeName: row.name as string,
      lineUserId: row.line_user_id as string | null,
    }
  }

  const { error: updateErr } = await admin
    .from("hr_employees")
    .update({ status: "active" })
    .eq("id", employeeId)

  if (updateErr) {
    return { ok: false, error: updateErr.message, status: 400 }
  }

  const lineUserId = row.line_user_id as string | null
  const employeeName = row.name as string
  const approverName = approverId
    ? await getApproverDisplayName(approverId)
    : "HR"

  await notifyDecisionParties({
    employeeLineUserId: lineUserId,
    employeeMessages: lineUserId
      ? [
          {
            type: "text",
            text: "✅ อนุมัติเข้าใช้งานแล้ว\n\nคุณสามารถใช้เมนู HR ใน LINE ได้แล้ว (เช็คอิน · ขอลา · OT ฯลฯ)",
          },
        ]
      : undefined,
    hrGroupText: [
      "✅ อนุมัติลงทะเบียนพนักงานแล้ว",
      `ชื่อ: ${employeeName}`,
      `โดย: ${approverName}`,
    ].join("\n"),
  })

  return {
    ok: true,
    employeeName,
    lineUserId,
  }
}

export async function rejectEmployeeRegistration(
  employeeId: string,
  note?: string,
  approverId?: string
): Promise<RegistrationDecisionResult> {
  const admin = getAdminClient()

  const { data: row, error: fetchErr } = await admin
    .from("hr_employees")
    .select("id, name, line_user_id, status, role")
    .eq("id", employeeId)
    .maybeSingle()

  if (fetchErr) {
    return { ok: false, error: fetchErr.message, status: 400 }
  }
  if (!row) {
    return { ok: false, error: "not found", status: 404 }
  }
  if (row.status === "active") {
    return { ok: false, error: "already active", status: 400 }
  }

  const lineUserId = row.line_user_id as string | null
  const employeeName = row.name as string
  const reasonLine =
    note && note.trim().length >= 3 ? `\n\nเหตุผล: ${note.trim()}` : ""
  const approverName = approverId
    ? await getApproverDisplayName(approverId)
    : "HR"

  await notifyDecisionParties({
    employeeLineUserId: lineUserId,
    employeeMessages: lineUserId
      ? [
          {
            type: "text",
            text: `❌ คำขอลงทะเบียนยังไม่ได้รับการอนุมัติ${reasonLine}\n\nกรุณาติดต่อ HR หรือลองลงทะเบียนใหม่ภายหลัง`,
          },
        ]
      : undefined,
    hrGroupText: [
      "❌ ปฏิเสธการลงทะเบียน",
      `ชื่อ: ${employeeName}`,
      note && note.trim().length >= 3 ? `เหตุผล: ${note.trim()}` : null,
      `โดย: ${approverName}`,
    ]
      .filter(Boolean)
      .join("\n"),
  })

  return {
    ok: true,
    employeeName,
    lineUserId,
  }
}
