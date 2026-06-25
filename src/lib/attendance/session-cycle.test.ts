import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  hasAttendanceFlag,
  isMissingCheckoutRecord,
  MISSING_CHECKOUT_FLAG,
  isRecheckinBlockedAfterCheckout,
  recheckinAvailableAt,
  isCheckoutStillInActiveCycle,
  sessionCutoffUtcForCheckIn,
  sessionCycleStartUtc,
} from "@/lib/attendance/session-cycle"

// Pure session model — no ICT-day boundary, no timezone arithmetic.

describe("session-cycle", () => {
  describe("missing checkout flags", () => {
    it("treats missing-checkout rows as non-open sessions", () => {
      assert.equal(
        isMissingCheckoutRecord([MISSING_CHECKOUT_FLAG]),
        true
      )
      assert.equal(
        hasAttendanceFlag(["outside_geofence", MISSING_CHECKOUT_FLAG], MISSING_CHECKOUT_FLAG),
        true
      )
      assert.equal(isMissingCheckoutRecord(["outside_geofence"]), false)
    })
  })

  describe("sessionCutoffUtcForCheckIn", () => {
    it("cuts off a session 24h after check-in (14:00 ICT shift)", () => {
      // 14:00 ICT = 07:00 UTC
      const checkInAt = new Date("2026-06-20T07:00:00.000Z")
      assert.equal(
        sessionCutoffUtcForCheckIn(checkInAt).toISOString(),
        "2026-06-21T07:00:00.000Z"
      )
    })

    it("cuts off a 03:00 ICT session 24h later", () => {
      const checkInAt = new Date("2026-06-19T20:00:00.000Z") // 03:00 ICT 20 Jun
      assert.equal(
        sessionCutoffUtcForCheckIn(checkInAt).toISOString(),
        "2026-06-20T20:00:00.000Z"
      )
    })

    it("auto-close window does not overlap the next session start", () => {
      // Employee checks in at 14:00 ICT, forgets to check out.
      // Next check-in attempt at 14:00 ICT next day = exactly the cutoff.
      const checkInAt = new Date("2026-06-20T07:00:00.000Z") // 14:00 ICT
      const nextShiftStart = new Date("2026-06-21T07:00:00.000Z") // 14:00 ICT next day
      const cutoff = sessionCutoffUtcForCheckIn(checkInAt)
      assert.ok(cutoff.getTime() <= nextShiftStart.getTime())
    })
  })

  describe("sessionCycleStartUtc", () => {
    it("returns now minus 24h regardless of ICT time", () => {
      const now = new Date("2026-06-20T11:00:00.000Z") // 18:00 ICT
      assert.equal(
        sessionCycleStartUtc(now).toISOString(),
        "2026-06-19T11:00:00.000Z"
      )
    })

    it("stays a pure rolling 24h window", () => {
      const now = new Date("2026-06-20T07:00:00.000Z") // 14:00 ICT
      assert.equal(
        sessionCycleStartUtc(now).toISOString(),
        sessionCycleStartUtc(now).toISOString()
      )
    })
  })

  describe("isCheckoutStillInActiveCycle", () => {
    it("returns true if checkout was less than 2h ago", () => {
      const checkOutAt = new Date("2026-06-21T19:00:00.000Z") // 02:00 ICT
      const now = new Date("2026-06-21T20:59:00.000Z")        // 1h59m later
      assert.equal(isCheckoutStillInActiveCycle(checkOutAt, now), true)
    })

    it("returns false after 2h", () => {
      const checkOutAt = new Date("2026-06-21T19:00:00.000Z") // 02:00 ICT
      const now = new Date("2026-06-21T21:00:00.000Z")        // exactly 2h later
      assert.equal(isCheckoutStillInActiveCycle(checkOutAt, now), false)
    })

    it("returns false long after checkout", () => {
      const checkOutAt = new Date("2026-06-21T19:00:00.000Z")
      const now = new Date("2026-06-21T23:00:00.000Z")        // 4h later
      assert.equal(isCheckoutStillInActiveCycle(checkOutAt, now), false)
    })
  })

  describe("isRecheckinBlockedAfterCheckout", () => {
    it("blocks a new check-in when checkout was less than 8h ago", () => {
      const checkOutAt = new Date("2026-06-22T19:01:00.000Z") // 02:01 ICT Jun 23
      const now = new Date("2026-06-22T23:00:00.000Z") // 06:00 ICT same day
      assert.equal(isRecheckinBlockedAfterCheckout(checkOutAt, now), true)
    })

    it("allows a new check-in once the 8h cooldown has passed", () => {
      const checkOutAt = new Date("2026-06-22T19:00:00.000Z") // 02:00 ICT Jun 23
      const now = new Date("2026-06-23T07:00:00.000Z") // 14:00 ICT Jun 23
      assert.equal(isRecheckinBlockedAfterCheckout(checkOutAt, now), false)
    })

    it("returns the exact unlock time 8h after checkout", () => {
      const checkOutAt = new Date("2026-06-22T19:00:00.000Z")
      assert.equal(
        recheckinAvailableAt(checkOutAt).toISOString(),
        "2026-06-23T03:00:00.000Z" // 10:00 ICT Jun 23
      )
    })
  })
})
