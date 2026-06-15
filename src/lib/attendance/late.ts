// ICT (Asia/Bangkok) time helpers — fixed UTC+7, no DST, no deps.
// All "day" boundaries are Thai-calendar days, returned as UTC instants.

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000

// [start, end) of the ICT day containing `now`, as UTC Dates for DB queries.
export function ictDayRangeUtc(now: Date): { start: Date; end: Date } {
  const ictMs = now.getTime() + ICT_OFFSET_MS
  const ictDayStartMs = Math.floor(ictMs / 86_400_000) * 86_400_000
  const start = new Date(ictDayStartMs - ICT_OFFSET_MS)
  return { start, end: new Date(start.getTime() + 86_400_000) }
}

// Minutes past today's HH:MM work start (ICT). 0 when on time or early.
export function lateMinutes(
  now: Date,
  startHour: number,
  startMinute: number
): number {
  const { start } = ictDayRangeUtc(now)
  const workStartMs =
    start.getTime() + (startHour * 60 + startMinute) * 60_000
  return Math.max(0, Math.floor((now.getTime() - workStartMs) / 60_000))
}

// "HH:mm" in ICT for user-facing messages.
export function formatIctTime(date: Date): string {
  const ictMs = date.getTime() + ICT_OFFSET_MS
  const minutesOfDay = Math.floor((ictMs % 86_400_000) / 60_000)
  const hh = String(Math.floor(minutesOfDay / 60)).padStart(2, "0")
  const mm = String(minutesOfDay % 60).padStart(2, "0")
  return `${hh}:${mm}`
}
