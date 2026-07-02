import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { resolveHrCheckOutAt } from "@/lib/attendance/hr-manage"

describe("resolveHrCheckOutAt", () => {
  it("supports explicit next-day checkout even without overnight shift metadata", () => {
    const checkOutAt = resolveHrCheckOutAt({
      date: "2026-07-01",
      checkInTime: "14:00",
      checkOutTime: "02:03",
      checkOutNextDay: true,
      shift: null,
    })

    assert.ok(checkOutAt)
    assert.equal(checkOutAt?.toISOString(), "2026-07-01T19:03:00.000Z")
  })

  it("auto-rolls checkout to next day for overnight shifts", () => {
    const checkOutAt = resolveHrCheckOutAt({
      date: "2026-07-01",
      checkInTime: "14:00",
      checkOutTime: "02:03",
      shift: { crosses_midnight: true },
    })

    assert.ok(checkOutAt)
    assert.equal(checkOutAt?.toISOString(), "2026-07-01T19:03:00.000Z")
  })

  it("rejects earlier checkout on non-overnight shifts when next-day is not set", () => {
    assert.throws(
      () =>
        resolveHrCheckOutAt({
          date: "2026-07-01",
          checkInTime: "14:00",
          checkOutTime: "02:03",
          shift: { crosses_midnight: false },
        }),
      /เวลาออกต้องหลังเวลาเข้า/
    )
  })
})
