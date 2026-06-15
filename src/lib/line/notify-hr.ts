import { getAdminClient } from "@/lib/auth/admin-client"
import { getLineClient } from "@/lib/line/client"
import { getRuntimeConfig } from "@/lib/runtime-config"
import type { messagingApi } from "@line/bot-sdk"

const MULTICAST_LIMIT = 500

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

async function notifyHrIndividuals(
  messages: messagingApi.Message[]
): Promise<number> {
  const { data: hrRows, error } = await getAdminClient()
    .from("hr_employees")
    .select("line_user_id")
    .in("role", ["hr"])
    .eq("status", "active")
    .not("line_user_id", "is", null)

  if (error) throw error

  const targets = (hrRows ?? []).map((r) => r.line_user_id as string)
  if (targets.length === 0) {
    return 0
  }

  const line = getLineClient()
  let pushed = 0
  for (let i = 0; i < targets.length; i += MULTICAST_LIMIT) {
    const chunk = targets.slice(i, i + MULTICAST_LIMIT)
    await line.multicast({ to: chunk, messages })
    pushed += chunk.length
  }

  return pushed
}

/** Notify HR LINE group and individual HR/admin users. */
export async function notifyHr(
  messages: messagingApi.Message[]
): Promise<{ pushed: number }> {
  const group = await notifyHrGroup(messages)
  let individualCount = 0
  try {
    individualCount = await notifyHrIndividuals(messages)
  } catch (error) {
    console.error("notifyHr individuals failed:", error)
  }

  return { pushed: (group.pushed ? 1 : 0) + individualCount }
}

export async function pushToLineUser(
  lineUserId: string,
  messages: messagingApi.Message[]
): Promise<void> {
  await getLineClient().pushMessage({ to: lineUserId, messages })
}
