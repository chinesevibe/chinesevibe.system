import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { isOvernightOpenShiftCheckout } from "@/lib/attendance/manual"

describe("isOvernightOpenShiftCheckout", () => {
  const branchNight = {
    start_hour: 14,
    start_minute: 0,
    end_hour: 2,
    end_minute: 0,
    crosses_midnight: true,
    grace_minutes: 10,
  }

  it("treats an open overnight checkout after midnight as non-retro", () => {
    assert.equal(
      isOvernightOpenShiftCheckout({
        mode: "checkout",
        existing: {
          id: "att-1",
          check_in_at: "2026-06-18T07:00:00.000Z",
          check_out_at: null,
          work_hours: null,
          shift_date: "2026-06-18",
        },
        shift: branchNight,
        now: new Date("2026-06-18T18:30:00.000Z"),
      }),
      true
    )
  })

  it("does not bypass retro once the overnight grace window is long past", () => {
    assert.equal(
      isOvernightOpenShiftCheckout({
        mode: "checkout",
        existing: {
          id: "att-1",
          check_in_at: "2026-06-18T07:00:00.000Z",
          check_out_at: null,
          work_hours: null,
          shift_date: "2026-06-18",
        },
        shift: branchNight,
        now: new Date("2026-06-19T06:00:00.000Z"),
      }),
      false
    )
  })
})
