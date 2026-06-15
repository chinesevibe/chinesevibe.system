import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { addDays, lastDayOfMonth, resolvePeriodRange } from "./period-range"

describe("resolvePeriodRange", () => {
  it("cutoff 31 for June uses full calendar month", () => {
    const range = resolvePeriodRange({ period: "2026-06", cutoffDay: 31 })
    assert.equal(range.periodStart, "2026-06-01")
    assert.equal(range.periodEnd, "2026-06-30")
    assert.equal(range.periodEndExclusive, "2026-07-01")
  })

  it("cutoff 25 spans previous month 26th to current 25th", () => {
    const range = resolvePeriodRange({ period: "2026-06", cutoffDay: 25 })
    assert.equal(range.periodStart, "2026-05-26")
    assert.equal(range.periodEnd, "2026-06-25")
    assert.equal(range.periodEndExclusive, "2026-06-26")
  })

  it("handles February leap year with cutoff 29", () => {
    const range = resolvePeriodRange({ period: "2024-02", cutoffDay: 29 })
    assert.equal(range.periodEnd, "2024-02-29")
    assert.equal(range.periodStart, "2024-01-30")
  })

  it("supports manual override", () => {
    const range = resolvePeriodRange({
      period: "2026-06",
      periodStart: "2026-06-10",
      periodEnd: "2026-06-20",
    })
    assert.equal(range.periodStart, "2026-06-10")
    assert.equal(range.periodEnd, "2026-06-20")
    assert.equal(range.periodEndExclusive, "2026-06-21")
  })
})

describe("addDays", () => {
  it("adds days across month boundary", () => {
    assert.equal(addDays("2026-05-31", 1), "2026-06-01")
  })
})

describe("lastDayOfMonth", () => {
  it("returns 29 for Feb 2024", () => {
    assert.equal(lastDayOfMonth(2024, 2), 29)
  })
})
