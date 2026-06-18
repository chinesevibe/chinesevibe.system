import type { AttendanceDayStatus } from "@/features/attendance/calendar-types"
import type { ShiftSchedule } from "@/lib/attendance/retro-limit"
import { isPastShiftEnd, isPastShiftStart } from "@/lib/attendance/retro-limit"

export function deriveAttendanceDayStatus(
  date: string,
  today: string,
  now: Date,
  shift: ShiftSchedule | null,
  onLeave: boolean,
  record: {
    check_in_at: string
    check_out_at: string | null
    is_late: boolean
  } | null,
  goLiveDate: string | null
): AttendanceDayStatus {
  if (goLiveDate && date < goLiveDate) return "no_shift"
  if (date > today) return "future"
  if (onLeave) return "on_leave"
  if (!shift) return "no_shift"

  if (!record) {
    if (date === today && !isPastShiftStart(date, shift, now)) return "future"
    if (date === today && !isPastShiftEnd(date, shift, now)) return "in_progress"
    if (!isPastShiftStart(date, shift, now)) return "future"
    return "missing_checkin"
  }

  if (!record.check_out_at) {
    if (date === today && !isPastShiftEnd(date, shift, now)) return "in_progress"
    return "missing_checkout"
  }

  return record.is_late ? "late" : "complete"
}
