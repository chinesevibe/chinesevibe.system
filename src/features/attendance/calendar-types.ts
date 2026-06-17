export type AttendanceDayStatus =
  | "complete"
  | "late"
  | "in_progress"
  | "missing_checkout"
  | "missing_checkin"
  | "on_leave"
  | "no_shift"
  | "future"
  | "retro_expired"

export type AttendanceDayCell = {
  date: string
  status: AttendanceDayStatus
  checkIn: string | null
  checkOut: string | null
  hours: number | null
  retroEligible: boolean
  retroExpired: boolean
  deadline: string | null
  attendanceId: string | null
}

import type { ShiftSchedule } from "@/lib/attendance/retro-limit"

export type AttendanceCalendarResult = {
  month: string
  days: AttendanceDayCell[]
  shift: ShiftSchedule | null
}
