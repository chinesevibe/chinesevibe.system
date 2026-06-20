import type { webhook } from "@line/bot-sdk"

import { getAdminClient } from "@/lib/auth/admin-client"
import { resolveLineUserIdFromSource } from "@/lib/line/handlers/source"

type WebhookEventRow = {
  event_type: string
  source_type: string | null
  source_user_id: string | null
  source_group_id: string | null
  source_room_id: string | null
  line_user_id: string | null
  employee_id: string | null
  employee_code: string | null
  employee_name: string | null
  message_type: string | null
  message_text: string | null
  location_payload: Record<string, unknown> | null
  event_payload: Record<string, unknown>
}

export type LineWebhookLogResult = {
  ok: boolean
  rowCount: number
  dbHost: string
  errorMessage: string | null
}

function redactWebhookEvent(event: webhook.Event): Record<string, unknown> {
  const payload = JSON.parse(JSON.stringify(event)) as Record<string, unknown>
  if ("replyToken" in payload) {
    payload.replyToken = "[redacted]"
  }
  return payload
}

function extractMessageType(event: webhook.Event): string | null {
  if (event.type !== "message") return null
  return event.message.type
}

function extractMessageText(event: webhook.Event): string | null {
  if (event.type !== "message" || event.message.type !== "text") {
    return null
  }
  return event.message.text
}

function extractLocationPayload(
  event: webhook.Event
): Record<string, unknown> | null {
  if (event.type !== "message" || event.message.type !== "location") {
    return null
  }

  return {
    latitude: event.message.latitude,
    longitude: event.message.longitude,
    address: event.message.address ?? null,
  }
}

async function resolveEmployeeSnapshot(
  lineUserId: string | null
): Promise<Pick<WebhookEventRow, "employee_id" | "employee_code" | "employee_name">> {
  if (!lineUserId) {
    return {
      employee_id: null,
      employee_code: null,
      employee_name: null,
    }
  }

  const admin = getAdminClient()
  const { data, error } = await admin
    .from("hr_employees")
    .select("id, employee_code, name")
    .eq("line_user_id", lineUserId)
    .maybeSingle()

  if (error || !data) {
    return {
      employee_id: null,
      employee_code: null,
      employee_name: null,
    }
  }

  return {
    employee_id: data.id as string,
    employee_code: (data.employee_code as string | null) ?? null,
    employee_name: data.name as string,
  }
}

function sourceMeta(event: webhook.Event) {
  const sourceType = event.source?.type ?? null
  const sourceUserId = resolveLineUserIdFromSource(event.source) ?? null
  return {
    source_type: sourceType,
    source_user_id: sourceUserId,
    source_group_id: event.source?.type === "group" ? event.source.groupId : null,
    source_room_id: event.source?.type === "room" ? event.source.roomId : null,
  }
}

function buildWebhookEventRow(event: webhook.Event): WebhookEventRow {
  const lineUserId = resolveLineUserIdFromSource(event.source) ?? null
  const rawEvent = redactWebhookEvent(event)
  const locationPayload = extractLocationPayload(event)

  return {
    event_type: event.type,
    ...sourceMeta(event),
    line_user_id: lineUserId,
    employee_id: null,
    employee_code: null,
    employee_name: null,
    message_type: extractMessageType(event),
    message_text: extractMessageText(event),
    location_payload: locationPayload,
    event_payload: rawEvent,
  }
}

function currentSupabaseHost(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!raw) return "missing"

  try {
    return new URL(raw).host
  } catch {
    return "invalid"
  }
}

function formatSupabaseError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "unknown"
  }

  const candidate = error as {
    code?: string
    details?: string
    hint?: string
    message?: string
  }

  return JSON.stringify({
    code: candidate.code ?? null,
    details: candidate.details ?? null,
    hint: candidate.hint ?? null,
    message: candidate.message ?? "unknown",
  })
}

export async function logLineWebhookEvents(
  events: webhook.Event[]
): Promise<LineWebhookLogResult> {
  if (events.length === 0) {
    return {
      ok: true,
      rowCount: 0,
      dbHost: currentSupabaseHost(),
      errorMessage: null,
    }
  }

  const rows: WebhookEventRow[] = []
  for (const event of events) {
    const row = buildWebhookEventRow(event)
    const employee = await resolveEmployeeSnapshot(row.line_user_id)
    rows.push({
      ...row,
      ...employee,
    })
  }

  try {
    const admin = getAdminClient()
    const { error } = await admin.from("hr_line_webhook_events").insert(rows)
    if (error) {
      const errorMessage = formatSupabaseError(error)
      console.error("logLineWebhookEvents failed", errorMessage)
      return {
        ok: false,
        rowCount: rows.length,
        dbHost: currentSupabaseHost(),
        errorMessage,
      }
    }

    console.info("logLineWebhookEvents ok", {
      rowCount: rows.length,
      dbHost: currentSupabaseHost(),
    })
    return {
      ok: true,
      rowCount: rows.length,
      dbHost: currentSupabaseHost(),
      errorMessage: null,
    }
  } catch (error) {
    const errorMessage = formatSupabaseError(error)
    console.error("logLineWebhookEvents threw", errorMessage)
    return {
      ok: false,
      rowCount: rows.length,
      dbHost: currentSupabaseHost(),
      errorMessage,
    }
  }
}
