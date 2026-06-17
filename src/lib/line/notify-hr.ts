import { getLineClient } from "@/lib/line/client"
import { getRuntimeConfig } from "@/lib/runtime-config"
import type { messagingApi } from "@line/bot-sdk"

export async function getHrLineGroupId(): Promise<string | null> {
  const fromDb = await getRuntimeConfig("hr_line_group_id")
  const trimmed = fromDb?.trim()
  if (trimmed) return trimmed
  const fromEnv = process.env.HR_LINE_GROUP_ID?.trim()
  return fromEnv || null
}

/** Push to HR LINE group only — best-effort, never throws. */
export async function notifyHrGroup(
  messages: messagingApi.Message[]
): Promise<{ pushed: boolean }> {
  const groupId = await getHrLineGroupId()
  if (!groupId) {
    console.warn("notifyHrGroup: hr_line_group_id not configured — skipped")
    return { pushed: false }
  }

  try {
    await getLineClient().pushMessage({ to: groupId, messages })
    return { pushed: true }
  } catch (error) {
    console.error("notifyHrGroup failed:", error)
    return { pushed: false }
  }
}

/** Notify HR via LINE group only (no 1:1 multicast to HR accounts). */
export async function notifyHr(
  messages: messagingApi.Message[]
): Promise<{ pushed: number }> {
  const group = await notifyHrGroup(messages)
  return { pushed: group.pushed ? 1 : 0 }
}

export async function pushToLineUser(
  lineUserId: string,
  messages: messagingApi.Message[]
): Promise<void> {
  await getLineClient().pushMessage({ to: lineUserId, messages })
}
