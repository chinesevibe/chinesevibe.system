#!/usr/bin/env node
import { createAssert } from "../test-helpers/assert.mjs"
import { cleanupE2eData, rest } from "../test-helpers/supabase-admin.mjs"
import "../test-helpers/env.mjs"

const { ok, summary } = createAssert("flow-announcements")

export async function runFlowAnnouncements() {
  await cleanupE2eData()

  const scheduledAt = new Date(Date.now() + 86_400_000).toISOString()

  const ins = await rest("hr_announcements", {
    method: "POST",
    body: {
      title: "E2E Scheduled Announcement",
      body: "Test scheduled broadcast body for Phase 3",
      target_type: "all",
      status: "scheduled",
      scheduled_at: scheduledAt,
    },
    prefer: "return=representation",
  })

  ok(ins.ok, "insert scheduled announcement")
  const row = Array.isArray(ins.data) ? ins.data[0] : ins.data
  ok(row?.status === "scheduled", "status scheduled")
  ok(Boolean(row?.scheduled_at), "scheduled_at set")

  if (row?.id) {
    await rest(`hr_announcements?id=eq.${row.id}`, { method: "DELETE" })
  }

  return summary()
}
