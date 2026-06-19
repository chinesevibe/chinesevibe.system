import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  formatOffDaysLabel,
  isEmployeeOffOnDate,
  isoWeekdayFromDate,
  parseOffDays,
  serializeOffDays,
} from "@/lib/employees/off-days"

describe("off-days", () => {
  it("parses and serializes weekday arrays", () => {
    assert.deepEqual(parseOffDays([7, 1, 1, 99]), [1, 7])
    assert.deepEqual(serializeOffDays([6, 7, 6]), [6, 7])
  })

  it("detects weekly off on calendar date", () => {
    assert.equal(isoWeekdayFromDate("2026-06-18"), 4)
    assert.equal(isEmployeeOffOnDate("2026-06-18", [4]), true)
    assert.equal(isEmployeeOffOnDate("2026-06-18", [1]), false)
  })

  it("formats Thai labels", () => {
    assert.equal(formatOffDaysLabel([1, 7]), "จ อา")
    assert.equal(formatOffDaysLabel([]), "—")
  })
})
