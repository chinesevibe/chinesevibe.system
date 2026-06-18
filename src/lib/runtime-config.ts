import { getAdminClient } from "@/lib/auth/admin-client"

const CACHE_MS = 60_000
let cache: { at: number; map: Map<string, string> } | null = null

async function loadMap(): Promise<Map<string, string>> {
  const now = Date.now()
  if (cache && now - cache.at < CACHE_MS) return cache.map

  const admin = getAdminClient()
  const { data } = await admin.from("hr_runtime_config").select("key, value")
  const map = new Map<string, string>()
  for (const row of data ?? []) {
    map.set(row.key as string, row.value as string)
  }
  cache = { at: now, map }
  return map
}

export async function getRuntimeConfig(key: string): Promise<string | null> {
  const map = await loadMap()
  return map.get(key) ?? null
}

export async function getWorkStart(): Promise<{ hour: number; minute: number }> {
  const map = await loadMap()
  const hour = Number(map.get("work_start_hour") ?? process.env.WORK_START_HOUR ?? 9)
  const minute = Number(map.get("work_start_minute") ?? process.env.WORK_START_MINUTE ?? 0)
  return {
    hour: Number.isFinite(hour) ? hour : 9,
    minute: Number.isFinite(minute) ? minute : 0,
  }
}

export function clearRuntimeConfigCache() {
  cache = null
}

/** ICT calendar date (YYYY-MM-DD) before which attendance is not enforced. */
export async function getAttendanceGoLiveDate(): Promise<string | null> {
  const raw = await getRuntimeConfig("attendance_go_live_date")
  if (!raw) return null
  const trimmed = raw.trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null
}
