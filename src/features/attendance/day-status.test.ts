import assert from "node:assert/strict"
import test from "node:test"

import { deriveAttendanceDayStatus } from "@/features/attendance/day-status"

const SHIFT = {
  start_hour: 14,
  start_minute: 0,
  end_hour: 2,
  end_minute: 0,
  crosses_midnight: true,
  grace_minutes: 10,
} as const

test("today without any attendance record is missing_checkin after shift start", () => {
  const status = deriveAttendanceDayStatus(
    "2026-06-20",
    "2026-06-20",
    new Date("2026-06-20T10:30:00.000Z"),
    SHIFT,
    false,
    null,
    null
  )

  assert.equal(status, "missing_checkin")
})

test("today with open attendance record stays in_progress before shift end", () => {
  const status = deriveAttendanceDayStatus(
    "2026-06-20",
    "2026-06-20",
    new Date("2026-06-20T10:30:00.000Z"),
    SHIFT,
    false,
    {
      check_in_at: "2026-06-20T07:15:00.000Z",
      check_out_at: null,
      is_late: false,
    },
    null
  )

  assert.equal(status, "in_progress")
})
