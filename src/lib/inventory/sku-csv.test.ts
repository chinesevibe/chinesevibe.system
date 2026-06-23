import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { parseCsvBoolean, parseSkuCsv } from "@/lib/inventory/sku-csv"

describe("parseSkuCsv", () => {
  it("parses english headers", () => {
    const parsed = parseSkuCsv(
      ["code,name,unit,min_stock,max_stock", "SKU-001,Water,ml,10,20"].join("\n")
    )

    assert.equal(parsed.ok, true)
    if (!parsed.ok) return
    assert.equal(parsed.rows[0]?.code, "SKU-001")
    assert.equal(parsed.rows[0]?.unit, "ml")
    assert.equal(parsed.rows[0]?.min_stock, "10")
  })

  it("parses thai headers and quoted values", () => {
    const parsed = parseSkuCsv(
      ['รหัสสินค้า,ชื่อสินค้า,หมวดหมู่', 'SKU-002,"Beer, Chang",เครื่องดื่ม'].join("\n")
    )

    assert.equal(parsed.ok, true)
    if (!parsed.ok) return
    assert.equal(parsed.rows[0]?.name, "Beer, Chang")
    assert.equal(parsed.rows[0]?.category, "เครื่องดื่ม")
  })

  it("fails when required headers are missing", () => {
    const parsed = parseSkuCsv("name,unit\nWater,ml")
    assert.equal(parsed.ok, false)
    if (parsed.ok) return
    assert.match(parsed.error, /code/i)
  })
})

describe("parseCsvBoolean", () => {
  it("maps active-ish values to true", () => {
    assert.equal(parseCsvBoolean("active", false), "true")
    assert.equal(parseCsvBoolean("ใช้งาน", false), "true")
  })

  it("maps inactive-ish values to false", () => {
    assert.equal(parseCsvBoolean("inactive", true), "false")
    assert.equal(parseCsvBoolean("0", true), "false")
  })
})
