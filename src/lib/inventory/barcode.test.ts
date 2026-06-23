import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  formatInventoryBarcodeConflict,
  normalizeInventoryBarcode,
} from "@/lib/inventory/barcode"

describe("normalizeInventoryBarcode", () => {
  it("trims values and collapses blanks to null", () => {
    assert.equal(normalizeInventoryBarcode(" 8851993616011 "), "8851993616011")
    assert.equal(normalizeInventoryBarcode("   "), null)
    assert.equal(normalizeInventoryBarcode(null), null)
  })
})

describe("formatInventoryBarcodeConflict", () => {
  it("includes unique sku codes once", () => {
    assert.equal(
      formatInventoryBarcodeConflict("8851993616011", [
        "BEV-001",
        "BEV-001",
        "BEV-002",
      ]),
      "barcode 8851993616011 ถูกผูกกับหลาย SKU (BEV-001, BEV-002) — แก้ข้อมูล SKU ให้เหลือ 1 รายการต่อ 1 barcode ก่อนใช้งาน"
    )
  })
})
