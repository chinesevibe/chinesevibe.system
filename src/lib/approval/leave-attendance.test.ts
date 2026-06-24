import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { shouldAutoCheckoutApprovedLeave } from "@/lib/approval/leave-attendance"

describe("shouldAutoCheckoutApprovedLeave", () => {
  it("applies only to same-day hourly leave approved on that ICT day", () => {
    assert.equal(
      shouldAutoCheckoutApprovedLeave({
        leaveUnit: "hours",
        startDate: "2026-06-24",
        endDate: "2026-06-24",
        approvalTime: new Date("2026-06-24T08:00:00.000Z"),
      }),
      true
    )
  })

  it("skips full-day leave requests", () => {
    assert.equal(
      shouldAutoCheckoutApprovedLeave({
        leaveUnit: "days",
        startDate: "2026-06-24",
        endDate: "2026-06-24",
        approvalTime: new Date("2026-06-24T08:00:00.000Z"),
      }),
      false
    )
  })

  it("skips hourly leave approved on a different ICT day", () => {
    assert.equal(
      shouldAutoCheckoutApprovedLeave({
        leaveUnit: "hours",
        startDate: "2026-06-24",
        endDate: "2026-06-24",
        approvalTime: new Date("2026-06-25T08:00:00.000Z"),
      }),
      false
    )
  })
})
