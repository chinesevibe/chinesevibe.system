import { getAdminClient } from "@/lib/auth/admin-client"
import { pushToLineUser } from "@/lib/line/notify-hr"

export { assertHrLineApprover } from "@/lib/line/approval/approver"

export type RegistrationDecisionResult =
  | { ok: true; employeeName: string; lineUserId: string | null }
  | { ok: false; error: string; status: 403 | 404 | 400 }

export async function approveEmployeeRegistration(
  employeeId: string
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
  if (lineUserId) {
    try {
      await pushToLineUser(lineUserId, [
        {
          type: "text",
          text: "✅ อนุมัติเข้าใช้งานแล้ว\n\nคุณสามารถใช้เมนู HR ใน LINE ได้แล้ว (เช็คอิน · ขอลา · OT ฯลฯ)",
        },
      ])
    } catch (e) {
      console.error("approve registration notify employee failed:", e)
    }
  }

  return {
    ok: true,
    employeeName: row.name as string,
    lineUserId,
  }
}

export async function rejectEmployeeRegistration(
  employeeId: string,
  note?: string
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
  const reasonLine =
    note && note.trim().length >= 3 ? `\n\nเหตุผล: ${note.trim()}` : ""

  if (lineUserId) {
    try {
      await pushToLineUser(lineUserId, [
        {
          type: "text",
          text: `❌ คำขอลงทะเบียนยังไม่ได้รับการอนุมัติ${reasonLine}\n\nกรุณาติดต่อ HR หรือลองลงทะเบียนใหม่ภายหลัง`,
        },
      ])
    } catch (e) {
      console.error("reject registration notify employee failed:", e)
    }
  }

  return {
    ok: true,
    employeeName: row.name as string,
    lineUserId,
  }
}
