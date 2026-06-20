import type { webhook } from "@line/bot-sdk"

import { getAdminClient } from "@/lib/auth/admin-client"
import { handleEvents } from "@/lib/line/handlers"
import { logLineWebhookEvents } from "@/lib/line/webhook-event-log"
import { verifyLineSignature } from "@/lib/line/verify-signature"

const HR_GROUP_CONFIG_KEY = "hr_line_group_id"

async function captureGroupId(groupId: string): Promise<void> {
  console.info("LINE webhook groupId", groupId)
  const admin = getAdminClient()
  const { error } = await admin.from("hr_runtime_config").upsert({
    key: HR_GROUP_CONFIG_KEY,
    value: groupId,
  })
  if (error) {
    console.error("Failed to persist LINE groupId", error)
  }
}

export async function POST(request: Request) {
  // Signature must be checked against the raw body string — do not parse first.
  const signature = request.headers.get("x-line-signature")
  const rawBody = await request.text()

  if (!verifyLineSignature(rawBody, signature)) {
    return Response.json({ error: "invalid signature" }, { status: 401 })
  }

  const body = JSON.parse(rawBody) as webhook.CallbackRequest
  const events = body.events ?? []

  const logResult = await logLineWebhookEvents(events)

  for (const event of events) {
    const groupId =
      "source" in event && event.source?.type === "group"
        ? event.source.groupId
        : undefined
    if (groupId) {
      await captureGroupId(groupId)
    }
  }
  await handleEvents(events)

  const response = Response.json({ ok: true })

  // ponytail: temporary prod debug headers -> remove after webhook insert root cause is confirmed.
  if (request.headers.get("x-codex-debug") === "1") {
    response.headers.set(
      "x-line-webhook-log-status",
      logResult.ok ? "ok" : "error"
    )
    response.headers.set("x-line-webhook-log-rows", String(logResult.rowCount))
    response.headers.set("x-line-webhook-db-host", logResult.dbHost)
    if (logResult.errorMessage) {
      response.headers.set(
        "x-line-webhook-log-error",
        encodeURIComponent(logResult.errorMessage).slice(0, 512)
      )
    }
  }

  return response
}
