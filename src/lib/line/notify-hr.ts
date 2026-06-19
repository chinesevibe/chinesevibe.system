import { getLineClient } from "@/lib/line/client"
import { getAdminClient } from "@/lib/auth/admin-client"
import { getRuntimeConfig } from "@/lib/runtime-config"
import type { messagingApi } from "@line/bot-sdk"

const MULTICAST_LIMIT = 500

type NotifyTarget = "group" | "multicast" | "none"

export type NotifyHrResult = {
  pushed: number
  target: NotifyTarget
  reason?: string
}

function notifyError(error: unknown): string {
  return error instanceof Error ? error.message : "LINE notify failed"
}

export async function getHrLineGroupId(): Promise<string | null> {
  const fromDb = await getRuntimeConfig("hr_line_group_id")
  const trimmed = fromDb?.trim()
  if (trimmed) return trimmed
  const fromEnv = process.env.HR_LINE_GROUP_ID?.trim()
  return fromEnv || null
}

/** Push to HR LINE group first — fallback to active HR users if group unavailable. */
export async function notifyHrGroup(
  messages: messagingApi.Message[]
): Promise<NotifyHrResult> {
  const groupId = await getHrLineGroupId()
  if (!groupId) {
    console.warn("notifyHrGroup: hr_line_group_id not configured — skipped")
    return { pushed: 0, target: "none", reason: "hr_line_group_id not configured" }
  }

  try {
    await getLineClient().pushMessage({ to: groupId, messages })
    return { pushed: 1, target: "group" }
  } catch (error) {
    console.error("notifyHrGroup failed:", error)
    return { pushed: 0, target: "group", reason: notifyError(error) }
  }
}

async function notifyHrMulticast(messages: messagingApi.Message[]): Promise<NotifyHrResult> {
  const admin = getAdminClient()

  const { data: hrRows, error } = await admin
    .from("hr_employees")
    .select("line_user_id")
    .eq("role", "hr")
    .eq("status", "active")
    .not("line_user_id", "is", null)

  if (error) {
    console.error("notifyHrMulticast: failed fetching HR users", error)
    return { pushed: 0, target: "multicast", reason: error.message ?? "hr lookup failed" }
  }

  const targets = (hrRows ?? [])
    .map((row) => row.line_user_id as string)
    .filter(Boolean)

  if (targets.length === 0) {
    return { pushed: 0, target: "none", reason: "no active HR line_user_id" }
  }

  let pushed = 0

  try {
    for (let index = 0; index < targets.length; index += MULTICAST_LIMIT) {
      const chunk = targets.slice(index, index + MULTICAST_LIMIT)
      const response = await getLineClient().multicast({ to: chunk, messages })
      const failed = Array.isArray((response as { failed?: string[] }).failed)
        ? (response as { failed?: string[] }).failed!
        : []
      if (failed.length === 0) {
        pushed += chunk.length
      } else {
        pushed += Math.max(0, chunk.length - failed.length)
      }
    }
  } catch (error) {
    console.error("notifyHrMulticast failed:", error)
    return {
      pushed,
      target: "multicast",
      reason: notifyError(error),
    }
  }

  return { pushed, target: "multicast" }
}

/** Notify HR via LINE group, fallback to active HR users via multicast. */
export async function notifyHr(messages: messagingApi.Message[]): Promise<NotifyHrResult> {
  const group = await notifyHrGroup(messages)
  if (group.target !== "none") return group

  const hrMulticast = await notifyHrMulticast(messages)
  return {
    pushed: hrMulticast.pushed,
    target: hrMulticast.target,
    reason: hrMulticast.reason,
  }
}

export async function pushToLineUser(
  lineUserId: string,
  messages: messagingApi.Message[]
): Promise<void> {
  await getLineClient().pushMessage({ to: lineUserId, messages })
}
