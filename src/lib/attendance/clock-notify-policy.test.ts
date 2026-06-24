import assert from "node:assert/strict"
import test from "node:test"

import { shouldPushClockReceipt } from "@/lib/attendance/clock-notify-policy"

test("shouldPushClockReceipt skips duplicate push for LINE location message flow", () => {
  assert.equal(shouldPushClockReceipt("line_location_message"), false)
  assert.equal(shouldPushClockReceipt("liff_geolocation"), true)
  assert.equal(shouldPushClockReceipt("unknown"), true)
  assert.equal(shouldPushClockReceipt(null), true)
})
