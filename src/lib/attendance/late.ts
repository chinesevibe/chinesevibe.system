// ICT (Asia/Bangkok) time helpers — fixed UTC+7, no DST, no deps.
// All "day" boundaries are Thai-calendar days, returned as UTC instants.

import { normalizeTimeToHHMM } from "@/lib/datetime/time-input"

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000

/** Grace when employee default_check_in_time is set but no work shift. */
export const DEFAULT_LATE_GRACE_MINUTES = 10

export type ShiftLateSchedule = {
  start_hour: number
  start_minute: number
  crosses_midnight: boolean
  grace_minutes: number
}

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

function checkInMinutesOnIctDay(checkInAt: Date, dayStart: Date): number {
  return Math.floor(
    ((checkInAt.getTime() - dayStart.getTime()) / 60_000 + 24 * 60) % (24 * 60)
  )
}

function parseEmployeeCheckInTime(
  value: string | null | undefined
): { hour: number; minute: number } | null {
  const normalized = normalizeTimeToHHMM(value)
  if (!normalized) return null
  const [hour, minute] = normalized.split(":").map(Number)
  return { hour, minute }
}

/** Late minutes vs a work start + grace (early check-in before start => 0). */
export function lateMinutesWithGrace(
  checkInAt: Date,
  startHour: number,
  startMinute: number,
  graceMinutes: number
): number {
  const dayStart = ictDayRangeUtc(checkInAt).start
  const startMinutes = startHour * 60 + startMinute
  const checkInMinutes = checkInMinutesOnIctDay(checkInAt, dayStart)

  // ponytail: before start on the ICT calendar day is early, not late
  if (checkInMinutes < startMinutes) {
    return 0
  }

  return Math.max(0, checkInMinutes - graceMinutes - startMinutes)
}

/** Late minutes vs employee work shift (early check-in before shift start => 0). */
export function lateMinutesForShift(
  checkInAt: Date,
  shift: ShiftLateSchedule
): number {
  return lateMinutesWithGrace(
    checkInAt,
    shift.start_hour,
    shift.start_minute,
    shift.grace_minutes
  )
}

export function isLateAtCheckIn(
  checkInAt: Date,
  shift: ShiftLateSchedule | null,
  fallbackStart: { hour: number; minute: number },
  defaultCheckInTime?: string | null
): boolean {
  return (
    lateMinutesAtCheckIn(checkInAt, shift, fallbackStart, defaultCheckInTime) > 0
  )
}

/**
 * Late minutes priority: employee default_check_in_time → work shift → global fallback.
 * Grace: shift grace when shift assigned, else DEFAULT_LATE_GRACE_MINUTES for employee default.
 */
export function lateMinutesAtCheckIn(
  checkInAt: Date,
  shift: ShiftLateSchedule | null,
  fallbackStart: { hour: number; minute: number },
  defaultCheckInTime?: string | null
): number {
  const employeeStart = parseEmployeeCheckInTime(defaultCheckInTime)
  if (employeeStart) {
    const grace = shift?.grace_minutes ?? DEFAULT_LATE_GRACE_MINUTES
    return lateMinutesWithGrace(
      checkInAt,
      employeeStart.hour,
      employeeStart.minute,
      grace
    )
  }
  if (shift) {
    return lateMinutesForShift(checkInAt, shift)
  }
  return lateMinutes(checkInAt, fallbackStart.hour, fallbackStart.minute)
}

/** Recompute late from schedule so stale DB is_late flags do not leak into roster UI. */
export function effectiveAttendanceIsLate(
  checkInAt: string,
  shift: ShiftLateSchedule | null,
  storedIsLate: boolean,
  defaultCheckInTime?: string | null,
  fallbackStart: { hour: number; minute: number } = { hour: 9, minute: 0 }
): boolean {
  if (defaultCheckInTime || shift) {
    return (
      lateMinutesAtCheckIn(
        new Date(checkInAt),
        shift,
        fallbackStart,
        defaultCheckInTime
      ) > 0
    )
  }
  return storedIsLate
}

// "HH:mm" in ICT for user-facing messages.
export function formatIctTime(date: Date): string {
  const ictMs = date.getTime() + ICT_OFFSET_MS
  const minutesOfDay = Math.floor((ictMs % 86_400_000) / 60_000)
  const hh = String(Math.floor(minutesOfDay / 60)).padStart(2, "0")
  const mm = String(minutesOfDay % 60).padStart(2, "0")
  return `${hh}:${mm}`
}
