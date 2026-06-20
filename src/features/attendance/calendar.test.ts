import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { resolveCalendarWorkHours } from "@/features/attendance/calendar"

describe("resolveCalendarWorkHours", () => {
  it("recomputes hours when stored work_hours is zero but check-in/out exist", () => {
    const hours = resolveCalendarWorkHours({
      checkInAt: "2026-06-18T07:00:00.000Z",
      checkOutAt: "2026-06-18T19:00:00.000Z",
      workHours: 0,
      shiftDate: "2026-06-18",
      shift: {
        start_hour: 14,
        start_minute: 0,
        end_hour: 2,
        end_minute: 0,
        crosses_midnight: true,
        grace_minutes: 10,
      },
      defaultCheckInTime: "14:00:00",
      defaultCheckOutTime: "02:00:00",
    })

    assert.equal(hours, 12)
  })

  it("recomputes from actual timestamps even when stored hours is positive", () => {
    const hours = resolveCalendarWorkHours({
      checkInAt: "2026-06-18T07:00:00.000Z",
      checkOutAt: "2026-06-18T19:00:00.000Z",
      workHours: 11.5,
      shiftDate: "2026-06-18",
      shift: null,
      defaultCheckInTime: "14:00:00",
      defaultCheckOutTime: "02:00:00",
    })

    assert.equal(hours, 12)
  })
})
