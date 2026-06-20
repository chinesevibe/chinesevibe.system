import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { profileScheduleFromTimes } from "@/lib/attendance/profile-schedule"

describe("profileScheduleFromTimes", () => {
  it("builds a same-day schedule from profile times", () => {
    assert.deepEqual(profileScheduleFromTimes("09:00", "18:00"), {
      start_hour: 9,
      start_minute: 0,
      end_hour: 18,
      end_minute: 0,
      crosses_midnight: false,
      grace_minutes: 10,
    })
  })

  it("marks overnight profile times as crosses_midnight", () => {
    assert.equal(profileScheduleFromTimes("14:00", "02:00")?.crosses_midnight, true)
  })
})
