import type { messagingApi } from "@line/bot-sdk"

import { fetchPendingQueuePayload } from "@/lib/approvals/pending-queue-data"
import { liffUrl } from "@/lib/i18n/liff-url"
import { resolveLocaleForLineUser } from "@/lib/i18n/employee-locale"
import { t } from "@/lib/i18n/translate"
import { DEFAULT_LOCALE } from "@/lib/i18n/types"
import { assertHrLineApprover } from "@/lib/line/approval/approver"
import { pendingQueueLiffFlex } from "@/lib/line/flex/pending-queue-liff"

export async function buildPendingQueueMessages(
  lineUserId: string | undefined
): Promise<messagingApi.Message[]> {
  const locale = lineUserId
    ? await resolveLocaleForLineUser(lineUserId)
    : DEFAULT_LOCALE

  const approver = await assertHrLineApprover(lineUserId)
  if (!approver) {
    return [{ type: "text", text: t("line.approval.noPermission", locale) }]
  }

  const url = liffUrl("/liff/approvals", locale)
  if (!url) {
    return [{ type: "text", text: t("liff.approvals.notConfigured", locale) }]
  }

  const { counts, total } = await fetchPendingQueuePayload()
  return [pendingQueueLiffFlex(url, counts, total, locale)]
}

export function isPendingQueueCommand(text: string): boolean {
  const trimmed = text.trim()
  const lower = trimmed.toLowerCase()
  return (
    lower === "/pending" ||
    trimmed === "เปิดคิวรออนุมัติ" ||
    trimmed === "ดูคิวรออนุมัติ" ||
    lower === "open pending queue"
  )
}

/** @deprecated use isPendingQueueCommand */
export function isPendingSlashCommand(text: string): boolean {
  return isPendingQueueCommand(text)
}
