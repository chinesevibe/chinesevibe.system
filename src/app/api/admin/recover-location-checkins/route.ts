// POST /api/admin/recover-location-checkins
// Finds LINE location messages from the last 6 h that failed to create attendance,
// then replays check-in for each affected employee using the original event timestamp.
import { NextResponse } from "next/server"

import { checkIn } from "@/lib/attendance/check-in"
import { getAdminClient } from "@/lib/auth/admin-client"
import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"

export async function POST() {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const admin = getAdminClient()
  const now = new Date()
  const windowStart = new Date(now.getTime() - 6 * 60 * 60 * 1000)

  const { data: logs, error } = await admin
    .from("hr_line_webhook_events")
    .select("employee_id, employee_name, employee_code, line_user_id, location_payload, event_payload, created_at")
    .eq("message_type", "location")
    .not("employee_id", "is", null)
    .not("line_user_id", "is", null)
    .gte("created_at", windowStart.toISOString())
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!logs || logs.length === 0) return NextResponse.json({ recovered: 0, results: [] })

  // One attempt per employee — use the earliest location message in the window.
  const seen = new Set<string>()
  const targets: typeof logs = []
  for (const log of logs) {
    const eid = log.employee_id as string
    if (seen.has(eid)) continue
    seen.add(eid)
    targets.push(log)
  }

  type Result = {
    employee: string
    code: string
    status: string
    checkInAt?: string
    error?: string
  }

  const results: Result[] = []

  for (const log of targets) {
    const lineUserId = log.line_user_id as string
    const payload = log.event_payload as { timestamp?: number } | null
    const eventMs = typeof payload?.timestamp === "number" ? payload.timestamp : null
    const checkInAt = eventMs ? new Date(eventMs) : new Date(log.created_at as string)

    const loc = log.location_payload as {
      latitude?: number
      longitude?: number
      address?: string
    } | null

    if (!loc?.latitude || !loc?.longitude) {
      results.push({ employee: log.employee_name as string, code: log.employee_code as string, status: "no_location" })
      continue
    }

    try {
      const result = await checkIn({
        lineUserId,
        location: {
          latitude: loc.latitude,
          longitude: loc.longitude,
          address: loc.address,
          source: "line_location_message",
          captured_at: checkInAt.toISOString(),
          accuracy_m: null,
        },
        now: checkInAt,
      })
      results.push({
        employee: log.employee_name as string,
        code: log.employee_code as string,
        status: result.status,
        checkInAt: checkInAt.toISOString(),
      })
    } catch (err) {
      results.push({
        employee: log.employee_name as string,
        code: log.employee_code as string,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const recovered = results.filter((r) => r.status === "success").length
  return NextResponse.json({ recovered, total: targets.length, results })
}

export async function GET() {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const admin = getAdminClient()
  const now = new Date()
  const windowStart = new Date(now.getTime() - 6 * 60 * 60 * 1000)

  const { data: logs, error } = await admin
    .from("hr_line_webhook_events")
    .select("employee_name, employee_code, line_user_id, location_payload, event_payload, created_at")
    .eq("message_type", "location")
    .not("employee_id", "is", null)
    .gte("created_at", windowStart.toISOString())
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    count: logs?.length ?? 0,
    window: { from: windowStart.toISOString(), to: now.toISOString() },
    logs: (logs ?? []).map((l) => {
      const payload = l.event_payload as { timestamp?: number } | null
      const ts = payload?.timestamp ? new Date(payload.timestamp).toISOString() : l.created_at
      return {
        employee: l.employee_name,
        code: l.employee_code,
        eventTime: ts,
        location: l.location_payload,
      }
    }),
  })
}
