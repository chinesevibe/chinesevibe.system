import { getAdminClient } from "@/lib/auth/admin-client"

export const PENDING_ACTION_KINDS = [
  "reject_leave",
  "reject_ot",
  "reject_registration",
  "reject_document",
  "reject_attendance",
  "complaint_reply",
  "complaint_close",
] as const

export type PendingActionKind = (typeof PENDING_ACTION_KINDS)[number]

export type PendingActionRow = {
  id: string
  line_user_id: string
  approver_employee_id: string
  action_kind: PendingActionKind
  target_id: string
  expires_at: string
  created_at: string
}

const TTL_MS = 15 * 60 * 1000

function isExpired(expiresAt: string): boolean {
  return Date.parse(expiresAt) <= Date.now()
}

export async function createPendingAction(input: {
  lineUserId: string
  approverEmployeeId: string
  actionKind: PendingActionKind
  targetId: string
}): Promise<PendingActionRow> {
  const admin = getAdminClient()
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString()

  const { data: existing } = await admin
    .from("hr_line_pending_actions")
    .select("id")
    .eq("line_user_id", input.lineUserId)
    .maybeSingle()

  if (existing?.id) {
    await admin.from("hr_line_pending_actions").delete().eq("id", existing.id)
  }

  const { data, error } = await admin
    .from("hr_line_pending_actions")
    .insert({
      line_user_id: input.lineUserId,
      approver_employee_id: input.approverEmployeeId,
      action_kind: input.actionKind,
      target_id: input.targetId,
      expires_at: expiresAt,
    })
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "create pending action failed")
  }

  return data as PendingActionRow
}

export async function getActivePendingAction(
  lineUserId: string
): Promise<PendingActionRow | null> {
  const admin = getAdminClient()
  const { data, error } = await admin
    .from("hr_line_pending_actions")
    .select("*")
    .eq("line_user_id", lineUserId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  if (isExpired(data.expires_at as string)) {
    await admin.from("hr_line_pending_actions").delete().eq("id", data.id)
    return null
  }

  return data as PendingActionRow
}

export async function deletePendingAction(lineUserId: string): Promise<void> {
  const admin = getAdminClient()
  await admin.from("hr_line_pending_actions").delete().eq("line_user_id", lineUserId)
}

export async function consumePendingAction(
  lineUserId: string,
  note: string
): Promise<
  | { ok: true; row: PendingActionRow; note: string }
  | { ok: false; reason: "none" | "expired" | "too_short" }
> {
  const trimmed = note.trim()
  if (trimmed.length < 3) {
    return { ok: false, reason: "too_short" }
  }

  const row = await getActivePendingAction(lineUserId)
  if (!row) {
    return { ok: false, reason: "none" }
  }

  await deletePendingAction(lineUserId)
  return { ok: true, row, note: trimmed }
}
