import type { messagingApi } from "@line/bot-sdk"

import { getAdminClient } from "@/lib/auth/admin-client"
import { resolveLocaleForLineUser } from "@/lib/i18n/employee-locale"
import { t } from "@/lib/i18n/translate"
import { DEFAULT_LOCALE } from "@/lib/i18n/types"
import { handleApprovalPostback } from "@/lib/line/handlers/approval-postback"
import { buildPendingQueueMessages, isPendingQueueCommand } from "@/lib/line/handlers/actions/pending-queue"
import { getHrLineGroupId } from "@/lib/line/notify-hr"

const APPROVE_TEXTS = new Set(["อนุมัติ", "approve"])
const REJECT_TEXTS = new Set(["ปฏิเสธ", "reject"])

export function isHrGroupCommandText(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  if (isPendingQueueCommand(trimmed)) return true
  return APPROVE_TEXTS.has(trimmed) || REJECT_TEXTS.has(trimmed)
}

export async function isKnownHrGroup(groupId: string | undefined): Promise<boolean> {
  if (!groupId) return false
  const configured = await getHrLineGroupId()
  if (!configured) return true
  return configured === groupId
}

async function latestPendingHrLeaveId(): Promise<string | null> {
  const admin = getAdminClient()
  const { data } = await admin
    .from("hr_leaves")
    .select("id")
    .eq("approval_status", "pending_hr")
    .order("created_at", { ascending: false })
    .limit(2)

  if (!data || data.length !== 1) return null
  return data[0].id as string
}

export async function handleHrGroupTextCommand(
  text: string,
  lineUserId: string | undefined
): Promise<messagingApi.Message[]> {
  const trimmed = text.trim()
  const locale = lineUserId
    ? await resolveLocaleForLineUser(lineUserId)
    : DEFAULT_LOCALE

  if (isPendingQueueCommand(trimmed)) {
    return buildPendingQueueMessages(lineUserId)
  }

  if (APPROVE_TEXTS.has(trimmed)) {
    const leaveId = await latestPendingHrLeaveId()
    if (!leaveId) {
      const queue = await buildPendingQueueMessages(lineUserId)
      if (queue.length > 0) {
        return [
          {
            type: "text",
            text: t("line.approval.groupApproveAmbiguous", locale),
          },
          ...queue,
        ]
      }
      return [{ type: "text", text: t("line.approval.notFound", locale) }]
    }
    return handleApprovalPostback(
      { action: "approve_leave", leaveId },
      lineUserId
    )
  }

  if (REJECT_TEXTS.has(trimmed)) {
    const leaveId = await latestPendingHrLeaveId()
    if (!leaveId) {
      return [{ type: "text", text: t("line.approval.notFound", locale) }]
    }
    return handleApprovalPostback(
      { action: "reject_leave", leaveId },
      lineUserId
    )
  }

  return []
}
