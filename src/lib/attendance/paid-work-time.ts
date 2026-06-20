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

/**
 * Compute paid work minutes from the actual check-in/out duration.
 *
 * Current business rule: pay hours follow actual start/end timestamps.
 * Shift/default schedule context is kept only so downstream callers can tell
 * whether a schedule existed when the record was computed.
 */
export function computePaidWorkMinutes({
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
  const paidHours = Math.round((rawMinutes / 60) * 100) / 100
  return {
    rawMinutes,
    paidMinutes: rawMinutes,
    paidHours,
    hasPayWindow: Boolean(shift || (defaultCheckInTime && defaultCheckOutTime)),
  }
}
