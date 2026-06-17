/** Accept HH:MM or HH:MM:SS (Postgres time) and normalize to HH:MM for inputs/API. */
export function normalizeTimeToHHMM(value: string | null | undefined): string {
  if (!value) return ""
  const trimmed = value.trim()
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?/.exec(trimmed)
  if (!match) return trimmed
  const hour = Number.parseInt(match[1], 10)
  const minute = match[2]
  if (hour < 0 || hour > 23) return trimmed
  return `${String(hour).padStart(2, "0")}:${minute}`
}

export function isValidTimeHHMM(value: string | null | undefined): boolean {
  if (!value) return true
  return /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(normalizeTimeToHHMM(value))
}

export function timeForApi(value: string | null | undefined): string | null {
  const normalized = normalizeTimeToHHMM(value)
  return normalized || null
}
