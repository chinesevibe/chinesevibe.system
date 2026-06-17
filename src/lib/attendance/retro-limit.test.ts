import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  correctionCost,
  getRetroDeadline,
  getShiftEndUtc,
  isWithinRetroWindow,
  needsRetroEnforcement,
  type ShiftSchedule,
} from "./retro-limit"

const officeShift: ShiftSchedule = {
  start_hour: 11,
  start_minute: 0,
  end_hour: 20,
  end_minute: 0,
  crosses_midnight: false,
  grace_minutes: 10,
}

describe("retro-limit", () => {
  it("counts full correction as two actions", () => {
    assert.deepEqual(correctionCost("full"), ["checkin", "checkout"])
    assert.deepEqual(correctionCost("checkin"), ["checkin"])
  })

  it("allows retro within 48h after shift end", () => {
    const workDate = "2026-06-16"
    const shiftEnd = getShiftEndUtc(workDate, officeShift)
    const within = new Date(shiftEnd.getTime() + 47 * 60 * 60 * 1000)
    const after = new Date(shiftEnd.getTime() + 49 * 60 * 60 * 1000)

    assert.equal(isWithinRetroWindow(workDate, officeShift, within), true)
    assert.equal(isWithinRetroWindow(workDate, officeShift, after), false)
  })

  it("deadline is shift end plus 48 hours", () => {
    const workDate = "2026-06-16"
    const shiftEnd = getShiftEndUtc(workDate, officeShift)
    const deadline = getRetroDeadline(workDate, officeShift)
    assert.equal(deadline.getTime(), shiftEnd.getTime() + 48 * 60 * 60 * 1000)
  })

  it("skips retro enforcement for same-day checkout completion", () => {
    const now = new Date("2026-06-16T12:00:00Z")
    const today = "2026-06-16"
    const existing = {
      check_in_at: "2026-06-16T04:00:00.000Z",
      check_out_at: null,
    }
    assert.equal(
      needsRetroEnforcement("checkout", today, existing, now),
      false
    )
  })

  it("requires retro enforcement for past-day backfill", () => {
    assert.equal(
      needsRetroEnforcement(
        "checkin",
        "2026-06-15",
        null,
        new Date("2026-06-16T12:00:00Z")
      ),
      true
    )
  })
})
