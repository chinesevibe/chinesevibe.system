import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { isEmployeeOffOnDate } from "@/lib/employees/off-days"

describe("attendance calendar off days", () => {
  it("marks configured weekday as off (not absent)", () => {
    assert.equal(isEmployeeOffOnDate("2026-06-18", [4]), true)
    assert.equal(isEmployeeOffOnDate("2026-06-18", [1]), false)
  })
})
