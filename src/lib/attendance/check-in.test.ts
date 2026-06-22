import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { nextIctDayStartUtc } from "@/lib/attendance/check-in"

describe("nextIctDayStartUtc", () => {
  it("returns the next ICT midnight for same-day re-check-in lock", () => {
    const now = new Date("2026-06-21T15:01:00.000Z") // 22:01 ICT
    assert.equal(
      nextIctDayStartUtc(now).toISOString(),
      "2026-06-21T17:00:00.000Z" // 00:00 ICT on June 22
    )
  })
})
