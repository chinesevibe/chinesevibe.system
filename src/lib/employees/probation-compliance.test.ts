import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { deriveProbationStatus } from "@/features/employees/profile/data"
import { probationNeedsComplianceAlert } from "@/lib/employees/probation-compliance"

describe("probationNeedsComplianceAlert", () => {
  it("skips when probation is closed", () => {
    assert.equal(
      probationNeedsComplianceAlert({
        probationEnd: "2026-06-11",
        probationOutcome: "passed",
      }),
      false
    )
    assert.equal(
      probationNeedsComplianceAlert({
        probationEnd: "2026-06-11",
        probationOutcome: "failed",
      }),
      false
    )
  })

  it("alerts while probation end exists without outcome", () => {
    assert.equal(
      probationNeedsComplianceAlert({
        probationEnd: "2026-06-11",
        probationOutcome: null,
      }),
      true
    )
  })
})

describe("deriveProbationStatus", () => {
  it("does not treat overdue probation as passed without outcome", () => {
    assert.equal(deriveProbationStatus("active", "2026-06-11", "2026-06-17", null), "overdue")
    assert.equal(
      deriveProbationStatus("active", "2026-06-11", "2026-06-17", "passed"),
      "passed"
    )
  })
})
