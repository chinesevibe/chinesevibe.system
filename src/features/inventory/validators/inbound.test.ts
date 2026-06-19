import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { invInboundOrderSchema } from "@/features/inventory/validators/inbound"

const WAREHOUSE_ID = "00000000-0000-4000-8000-000000000001"
const SUPPLIER_ID = "00000000-0000-4000-8000-000000000002"

describe("invInboundOrderSchema", () => {
  it("accepts empty supplier_id as null", () => {
    const result = invInboundOrderSchema.parse({
      supplier_id: "",
      warehouse_id: WAREHOUSE_ID,
    })
    assert.equal(result.supplier_id, null)
  })

  it("accepts valid supplier uuid", () => {
    const result = invInboundOrderSchema.parse({
      supplier_id: SUPPLIER_ID,
      warehouse_id: WAREHOUSE_ID,
    })
    assert.equal(result.supplier_id, SUPPLIER_ID)
  })
})
