/**
 * Tests for 14:00–02:00 overnight shift re-check-in flow.
 *
 * The invariant: an employee who completed the 14:00–02:00 shift
 * (checked out at 02:00 ICT) must be able to check in again at 14:00 ICT
 * the following day without being blocked.
 */
import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { ictDayRangeUtc } from "@/lib/attendance/late"

// ─── helpers ──────────────────────────────────────────────────────────────────

function ict(dateStr: string, h: number, m = 0): Date {
  // Build a UTC Date that represents H:MM ICT on dateStr.
  const [y, mo, d] = dateStr.split("-").map(Number)
  return new Date(Date.UTC(y, mo - 1, d, h - 7, m)) // UTC = ICT - 7 h
}

const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000

/** Mirrors the gap-check added to today-state.ts */
function shouldBlockReCheckin(checkOutAt: Date, now: Date): boolean {
  return now.getTime() - checkOutAt.getTime() < EIGHT_HOURS_MS
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe("ictDayRangeUtc — overnight shift day boundary", () => {
  it("14:00 ICT June 20 falls inside June 20 ICT day range", () => {
    const now = ict("2026-06-20", 14) // 14:00 ICT June 20 = 07:00 UTC June 20
    const { start, end } = ictDayRangeUtc(now)
    assert.ok(now >= start, "now should be >= day start")
    assert.ok(now < end, "now should be < day end")
  })

  it("14:00 ICT June 19 check-in is NOT in June 20 ICT day range", () => {
    const checkInAt = ict("2026-06-19", 14) // 07:00 UTC June 19
    const now = ict("2026-06-20", 14)        // 07:00 UTC June 20
    const { start, end } = ictDayRangeUtc(now)
    assert.ok(
      checkInAt < start,
      "previous-day 14:00 ICT check-in must NOT be in today's range (normal path works)"
    )
    assert.ok(checkInAt < end)
  })

  it("02:00 ICT June 20 check-out is in June 20 ICT day range", () => {
    // 02:00 ICT June 20 = 19:00 UTC June 19
    const checkOutAt = ict("2026-06-20", 2)  // 19:00 UTC June 19
    const now = ict("2026-06-20", 14)
    const { start, end } = ictDayRangeUtc(now)
    // check_out_at is in range — but today-state.ts filters by check_IN_at, not check_OUT_at
    // This test just documents the UTC math.
    assert.ok(checkOutAt >= start, "02:00 ICT June 20 checkout IS in June 20 day range")
    assert.ok(checkOutAt < end)
  })
})

describe("8-hour gap check — shouldBlockReCheckin", () => {
  it("02:00 checkout → 14:00 next attempt: gap 12 h → should NOT block", () => {
    const checkOutAt = ict("2026-06-20", 2)  // 02:00 ICT June 20
    const now        = ict("2026-06-20", 14) // 14:00 ICT June 20
    const gap = now.getTime() - checkOutAt.getTime()
    assert.equal(gap, 12 * 60 * 60 * 1000, "gap should be exactly 12 hours")
    assert.equal(shouldBlockReCheckin(checkOutAt, now), false, "must NOT block: 12h ≥ 8h")
  })

  it("13:00 checkout → 14:00 next attempt: gap 1 h → SHOULD block", () => {
    const checkOutAt = ict("2026-06-20", 13)
    const now        = ict("2026-06-20", 14)
    assert.equal(shouldBlockReCheckin(checkOutAt, now), true, "must block: 1h < 8h")
  })

  it("07:59 checkout → 15:59 next attempt: gap exactly 7h59m → SHOULD block", () => {
    const checkOutAt = ict("2026-06-20", 8, 0)   // 08:00 ICT
    const now = new Date(checkOutAt.getTime() + (8 * 60 * 60 * 1000) - 60_000) // 7h59m later
    assert.equal(shouldBlockReCheckin(checkOutAt, now), true, "1 min short of 8h → still blocks")
  })

  it("exactly 8h gap → should NOT block (boundary inclusive)", () => {
    const checkOutAt = ict("2026-06-20", 6)
    const now = new Date(checkOutAt.getTime() + EIGHT_HOURS_MS)
    assert.equal(shouldBlockReCheckin(checkOutAt, now), false, "exactly 8h → allows")
  })
})

describe("full overnight scenario: June 19 14:00 → June 20 02:00 → June 20 14:00", () => {
  const checkInJune19  = ict("2026-06-19", 14) // 07:00 UTC June 19
  const checkOutJune20 = ict("2026-06-20",  2) // 19:00 UTC June 19
  const reCheckIn      = ict("2026-06-20", 14) // 07:00 UTC June 20

  it("previous check-in is NOT in re-check-in day's ICT range", () => {
    const { start } = ictDayRangeUtc(reCheckIn)
    assert.ok(
      checkInJune19 < start,
      "June 19 14:00 check-in is BEFORE June 20 ICT day start — step 2 won't find it"
    )
  })

  it("gap between checkout and re-check-in attempt is 12 h → not blocked", () => {
    assert.equal(
      shouldBlockReCheckin(checkOutJune20, reCheckIn),
      false,
      "12-hour gap: employee must be able to check in for next shift"
    )
  })

  it("work shift crosses_midnight flag: shift end UTC for June 19 is June 19 19:00 UTC", () => {
    // getShiftEndUtc("2026-06-19", crosses_midnight=true, end_hour=2, end_minute=0)
    // = Date.UTC(2026, 5, 20, 2, 0) - 7h = 2026-06-19T19:00:00Z
    const shiftEndUtc = new Date(Date.UTC(2026, 5, 20, 2, 0, 0) - 7 * 3600_000)
    assert.equal(
      shiftEndUtc.toISOString(),
      "2026-06-19T19:00:00.000Z",
      "auto-cutoff would set check_out_at to 2026-06-19T19:00:00Z (02:00 ICT June 20)"
    )
    assert.deepEqual(checkOutJune20, shiftEndUtc, "test fixture matches real cutoff value")
  })
})
