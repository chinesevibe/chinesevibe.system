import { ictLocalToUtc } from "@/lib/attendance/ict-datetime"

export type PaidWorkShiftWindow = {
  start_hour: number
  start_minute: number
  end_hour: number
  end_minute: number
  crosses_midnight: boolean
  grace_minutes?: number
}

export type PaidWorkMinutesResult = {
  rawMinutes: number
  paidMinutes: number
  paidHours: number
  hasPayWindow: boolean
}

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000

/**
 * Compute paid work minutes within a shift window (or raw duration if no window).
 *
 * - If `shift` is provided, the window is built from the resolved ICT date.
 *   The date is taken from shiftDate, then workDate, then derived from checkInAt.
 *   end is placed on the next day when crosses_midnight is true OR end <= start.
 * - If `shift` is null but both defaultCheckInTime and defaultCheckOutTime are
 *   provided, those are used as the ICT window on the resolved date.
 * - Otherwise falls back to raw duration (hasPayWindow = false).
 */
export function computePaidWorkMinutes({
  workDate,
  shiftDate,
  checkInAt,
  checkOutAt,
  shift,
  defaultCheckInTime,
  defaultCheckOutTime,
}: {
  workDate?: string
  shiftDate?: string
  checkInAt: Date
  checkOutAt: Date
  shift: PaidWorkShiftWindow | null
  defaultCheckInTime?: string | null
  defaultCheckOutTime?: string | null
}): PaidWorkMinutesResult {
  const rawMinutes = Math.max(
    0,
    Math.floor((checkOutAt.getTime() - checkInAt.getTime()) / 60_000)
  )

  // Reference date for window construction (ICT calendar day of check-in).
  const refDate =
    shiftDate ??
    workDate ??
    new Date(checkInAt.getTime() + ICT_OFFSET_MS).toISOString().slice(0, 10)

  if (shift) {
    const windowStart = ictLocalToUtc(
      refDate,
      hhmmFromHourMinute(shift.start_hour, shift.start_minute)
    )
    let windowEnd = ictLocalToUtc(
      refDate,
      hhmmFromHourMinute(shift.end_hour, shift.end_minute)
    )

    if (shift.crosses_midnight || windowEnd.getTime() <= windowStart.getTime()) {
      windowEnd = new Date(windowEnd.getTime() + 24 * 60 * 60 * 1000)
    }

    return computeOverlap(
      rawMinutes,
      checkInAt,
      checkOutAt,
      windowStart,
      windowEnd,
      shift.grace_minutes ?? 0
    )
  }

  if (defaultCheckInTime && defaultCheckOutTime) {
    const windowStart = ictLocalToUtc(refDate, normalizeTimeToHHMM(defaultCheckInTime))
    let windowEnd = ictLocalToUtc(refDate, normalizeTimeToHHMM(defaultCheckOutTime))
    if (windowEnd.getTime() <= windowStart.getTime()) {
      windowEnd = new Date(windowEnd.getTime() + 24 * 60 * 60 * 1000)
    }
    return computeOverlap(rawMinutes, checkInAt, checkOutAt, windowStart, windowEnd)
  }

  return fallback(rawMinutes)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hhmmFromHourMinute(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

/** Ensure a time string is HH:mm (pass-through if already). */
export function normalizeTimeToHHMM(time: string): string {
  const parts = time.split(":")
  if (parts.length < 2) throw new Error("invalid time: " + time)
  const hh = parts[0].padStart(2, "0")
  const mm = parts[1].padStart(2, "0")
  return `${hh}:${mm}`
}

function computeOverlap(
  rawMinutes: number,
  actualIn: Date,
  actualOut: Date,
  windowStart: Date,
  windowEnd: Date,
  graceMinutes = 0
): PaidWorkMinutesResult {
  const graceMs = Math.max(0, graceMinutes) * 60_000
  const effectiveIn =
    actualIn.getTime() > windowStart.getTime() &&
    actualIn.getTime() <= windowStart.getTime() + graceMs
      ? windowStart
      : actualIn
  const overlapMs = Math.max(
    0,
    Math.min(actualOut.getTime(), windowEnd.getTime()) -
      Math.max(effectiveIn.getTime(), windowStart.getTime())
  )
  const paidMinutes = Math.floor(overlapMs / 60_000)
  const paidHours = Math.round((paidMinutes / 60) * 100) / 100
  return { rawMinutes, paidMinutes, paidHours, hasPayWindow: true }
}

function fallback(rawMinutes: number): PaidWorkMinutesResult {
  const paidHours = Math.round((rawMinutes / 60) * 100) / 100
  return { rawMinutes, paidMinutes: rawMinutes, paidHours, hasPayWindow: false }
}
