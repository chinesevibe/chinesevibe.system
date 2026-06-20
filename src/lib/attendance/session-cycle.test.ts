import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { sessionCutoffUtcForCheckIn, sessionCycleStartUtc } from "@/lib/attendance/session-cycle"

function ict(dateStr: string, hour: number, minute = 0): Date {
  const [year, month, day] = dateStr.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day, hour - 7, minute, 0, 0))
}

describe("session-cycle", () => {
  it("cuts off a 14:00 ICT session at 06:00 ICT next day", () => {
    const checkInAt = ict("2026-06-19", 14)
    assert.equal(
      sessionCutoffUtcForCheckIn(checkInAt).toISOString(),
      "2026-06-19T23:00:00.000Z"
    )
  })

  it("cuts off a 03:00 ICT session at 06:00 ICT same day", () => {
    const checkInAt = ict("2026-06-20", 3)
    assert.equal(
      sessionCutoffUtcForCheckIn(checkInAt).toISOString(),
      "2026-06-19T23:00:00.000Z"
    )
  })

  it("starts a new cycle at 06:00 ICT", () => {
    assert.equal(
      sessionCycleStartUtc(ict("2026-06-20", 5, 59)).toISOString(),
      "2026-06-18T23:00:00.000Z"
    )
    assert.equal(
      sessionCycleStartUtc(ict("2026-06-20", 6, 0)).toISOString(),
      "2026-06-19T23:00:00.000Z"
    )
  })
})
