import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { normalizeParams } from "@/features/employees/data"

describe("normalizeParams", () => {
  const validShiftId = "e3f4a5d8-7f6b-4c5a-9d5e-123456789abc"

  it("accepts shift_id parameter", () => {
    const params = normalizeParams({
      shift_id: validShiftId,
      sort: "name",
      page: "2",
    })
    assert.equal(params.work_shift_id, validShiftId)
    assert.equal(params.page, 2)
  })

  it("falls back to legacy shift parameter for compatibility", () => {
    const params = normalizeParams({
      shift: validShiftId,
      sort: "name",
    })
    assert.equal(params.work_shift_id, validShiftId)
  })

  it("trims whitespace from shift input to keep legacy links working", () => {
    const params = normalizeParams({
      shift_id: `  ${validShiftId}  `,
      sort: "name",
    })
    assert.equal(params.work_shift_id, validShiftId)
  })

  it("ignores invalid shift ids", () => {
    const params = normalizeParams({
      shift_id: "abc",
      sort: "name",
    })
    assert.equal(params.work_shift_id, "")
  })

  it("keeps __none__ as explicit no-shift filter", () => {
    const params = normalizeParams({
      shift_id: "__none__",
      sort: "name",
    })
    assert.equal(params.work_shift_id, "__none__")
  })
})
