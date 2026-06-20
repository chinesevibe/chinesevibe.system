import type { ShiftSchedule } from "@/lib/attendance/retro-limit"
import { normalizeTimeToHHMM } from "@/lib/datetime/time-input"

function parseTime(value: string | null | undefined): { hour: number; minute: number } | null {
  const normalized = normalizeTimeToHHMM(value)
  if (!normalized) return null
  const [hour, minute] = normalized.split(":").map(Number)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
  return { hour, minute }
}

export function profileScheduleFromTimes(
  defaultCheckInTime: string | null | undefined,
  defaultCheckOutTime: string | null | undefined,
  graceMinutes = 10
): ShiftSchedule | null {
  const checkIn = parseTime(defaultCheckInTime)
  const checkOut = parseTime(defaultCheckOutTime)
  if (!checkIn || !checkOut) return null

  const checkInMinutes = checkIn.hour * 60 + checkIn.minute
  const checkOutMinutes = checkOut.hour * 60 + checkOut.minute

  return {
    start_hour: checkIn.hour,
    start_minute: checkIn.minute,
    end_hour: checkOut.hour,
    end_minute: checkOut.minute,
    crosses_midnight: checkOutMinutes <= checkInMinutes,
    grace_minutes: graceMinutes,
  }
}
