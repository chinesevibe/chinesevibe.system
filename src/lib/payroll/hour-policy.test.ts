import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  resolveRegularWorkHours,
  roundPayrollHours,
  shouldTrackRegularWorkHours,
} from "./hour-policy"

describe("payroll hour policy", () => {
  it("rounds payroll hours to whole hours", () => {
    assert.equal(roundPayrollHours(11.17), 11)
    assert.equal(roundPayrollHours(11.5), 12)
    assert.equal(roundPayrollHours(0.49), 0)
  })

  it("skips regular work hours for monthly employees", () => {
    assert.equal(shouldTrackRegularWorkHours("monthly"), false)
    assert.equal(resolveRegularWorkHours("monthly", 12.4), null)
  })

  it("keeps rounded regular work hours for hourly employees", () => {
    assert.equal(shouldTrackRegularWorkHours("hourly"), true)
    assert.equal(resolveRegularWorkHours("hourly", 10.6), 11)
  })
})
