import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { computePaidWorkMinutes } from "@/lib/attendance/paid-work-time"
import { ictLocalToUtc } from "@/lib/attendance/ict-datetime"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a UTC Date from an ICT date string + HH:mm. */
function ict(date: string, hhmm: string): Date {
  return ictLocalToUtc(date, hhmm)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("computePaidWorkMinutes", () => {
  // Branch Day shift window: 10:00–22:00 (no midnight crossing)
  const branchDayShift = {
    start_hour: 10,
    start_minute: 0,
    end_hour: 22,
    end_minute: 0,
    crosses_midnight: false,
  }

  it("Branch Day: early check-in and late check-out clamp to window (720 min / 12.00 h)", () => {
    const checkIn = ict("2026-06-18", "09:50")
    const checkOut = ict("2026-06-18", "22:10")
    const result = computePaidWorkMinutes({
      checkInAt: checkIn,
      checkOutAt: checkOut,
      shift: branchDayShift,
    })
    assert.equal(result.paidMinutes, 720)
    assert.equal(result.paidHours, 12.00)
    assert.equal(result.hasPayWindow, true)
  })

  it("Branch Day: late check-in and slightly late check-out (665 min / 11.08 h)", () => {
    const checkIn = ict("2026-06-18", "10:55")
    const checkOut = ict("2026-06-18", "22:05")
    const result = computePaidWorkMinutes({
      checkInAt: checkIn,
      checkOutAt: checkOut,
      shift: branchDayShift,
    })
    assert.equal(result.paidMinutes, 665)
    assert.equal(result.paidHours, 11.08)
    assert.equal(result.hasPayWindow, true)
  })

  it("Branch Day: shift window 11:00–22:00, check-in before window (660 min / 11.00 h)", () => {
    const shift1100 = {
      start_hour: 11,
      start_minute: 0,
      end_hour: 22,
      end_minute: 0,
      crosses_midnight: false,
    }
    const checkIn = ict("2026-06-18", "10:55")
    const checkOut = ict("2026-06-18", "22:05")
    const result = computePaidWorkMinutes({
      checkInAt: checkIn,
      checkOutAt: checkOut,
      shift: shift1100,
    })
    assert.equal(result.paidMinutes, 660)
    assert.equal(result.paidHours, 11.00)
    assert.equal(result.hasPayWindow, true)
  })

  // Branch Night shift window: 14:00–02:00 next day (crosses_midnight: true)
  const branchNightShift = {
    start_hour: 14,
    start_minute: 0,
    end_hour: 2,
    end_minute: 0,
    crosses_midnight: true,
  }

  it("Branch Night: early check-in and late check-out clamp to window (720 min / 12.00 h)", () => {
    const checkIn = ict("2026-06-18", "13:50")
    const checkOut = ict("2026-06-19", "02:10")
    const result = computePaidWorkMinutes({
      checkInAt: checkIn,
      checkOutAt: checkOut,
      shift: branchNightShift,
      shiftDate: "2026-06-18",
    })
    assert.equal(result.paidMinutes, 720)
    assert.equal(result.paidHours, 12.00)
    assert.equal(result.hasPayWindow, true)
  })

  it("Branch Night: late check-in and early check-out (630 min / 10.50 h)", () => {
    const checkIn = ict("2026-06-18", "15:00")
    const checkOut = ict("2026-06-19", "01:30")
    const result = computePaidWorkMinutes({
      checkInAt: checkIn,
      checkOutAt: checkOut,
      shift: branchNightShift,
      shiftDate: "2026-06-18",
    })
    assert.equal(result.paidMinutes, 630)
    assert.equal(result.paidHours, 10.50)
    assert.equal(result.hasPayWindow, true)
  })

  it("No shift: falls back to raw duration (670 min / 11.17 h, hasPayWindow false)", () => {
    const checkIn = ict("2026-06-18", "10:55")
    const checkOut = ict("2026-06-18", "22:05")
    const result = computePaidWorkMinutes({
      checkInAt: checkIn,
      checkOutAt: checkOut,
      shift: null,
    })
    assert.equal(result.paidMinutes, 670)
    assert.equal(result.paidHours, 11.17)
    assert.equal(result.hasPayWindow, false)
  })
})
