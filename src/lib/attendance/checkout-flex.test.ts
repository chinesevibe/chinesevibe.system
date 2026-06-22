import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { checkoutSummaryFlex } from "@/lib/line/flex/checkout"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively flatten all string values from an object into a single string. */
function flattenJson(value: unknown): string {
  if (typeof value === "string") return value
  if (Array.isArray(value)) return value.map(flattenJson).join(" ")
  if (value !== null && typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map(flattenJson)
      .join(" ")
  }
  return ""
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("checkoutSummaryFlex", () => {
  const baseArgs = {
    name: "Test Employee",
    inText: "10:55",
    outText: "22:05",
    locale: "th" as const,
  }

  describe("hourly/branch display (showWorkDuration: true)", () => {
    it("includes รวมเวลา row label and '11 ชม. 5 นาที' value", () => {
      const msg = checkoutSummaryFlex({
        ...baseArgs,
        workMinutes: 665,
        showWorkDuration: true,
        monthSummary: { workDays: 12, totalHours: 107.7 },
      })
      const json = flattenJson(msg)
      assert.ok(json.includes("รวมเวลา"), "should include รวมเวลา row label")
      assert.ok(
        json.includes("11 ชม. 5 นาที"),
        "should include '11 ชม. 5 นาที' duration"
      )
    })

    it("footer is exactly บันทึกเวลาเข้า-ออกเรียบร้อยแล้ว (no OT text)", () => {
      const msg = checkoutSummaryFlex({
        ...baseArgs,
        workMinutes: 665,
        showWorkDuration: true,
        monthSummary: { workDays: 12, totalHours: 107.7 },
      })
      const json = flattenJson(msg)
      assert.ok(
        json.includes("บันทึกเวลาเข้า-ออกเรียบร้อยแล้ว"),
        "should include footer text"
      )
      assert.ok(
        !json.includes("เกินเวลามาตรฐาน"),
        "should NOT include เกินเวลามาตรฐาน"
      )
      assert.ok(!json.includes("ขอ OT"), "should NOT include ขอ OT")
    })
  })

  describe("monthly/office display (showWorkDuration: false)", () => {
    it("does NOT include รวมเวลา row label", () => {
      const msg = checkoutSummaryFlex({
        ...baseArgs,
        workMinutes: 665,
        showWorkDuration: false,
        monthSummary: { workDays: 12, totalHours: 107.7 },
      })
      const json = flattenJson(msg)
      assert.ok(
        !json.includes("รวมเวลา"),
        "should NOT include รวมเวลา row label"
      )
    })

    it("footer is exactly บันทึกเวลาเข้า-ออกเรียบร้อยแล้ว (no OT text)", () => {
      const msg = checkoutSummaryFlex({
        ...baseArgs,
        workMinutes: 665,
        showWorkDuration: false,
        monthSummary: { workDays: 12, totalHours: 107.7 },
      })
      const json = flattenJson(msg)
      assert.ok(
        json.includes("บันทึกเวลาเข้า-ออกเรียบร้อยแล้ว"),
        "should include footer text"
      )
      assert.ok(
        !json.includes("เกินเวลามาตรฐาน"),
        "should NOT include เกินเวลามาตรฐาน"
      )
      assert.ok(!json.includes("ขอ OT"), "should NOT include ขอ OT")
    })
  })

  it("includes monthly summary rows", () => {
    const msg = checkoutSummaryFlex({
      ...baseArgs,
      workMinutes: 665,
      showWorkDuration: true,
      monthSummary: { workDays: 12, totalHours: 107.7 },
    })
    const json = flattenJson(msg)
    assert.ok(json.includes("สรุปเดือนนี้"), "should include monthly summary label")
    assert.ok(json.includes("จำนวนวันที่ทำ"), "should include work days label")
    assert.ok(json.includes("12"), "should include work days count")
    assert.ok(json.includes("107.7 ชม."), "should include total hours summary")
  })
})
