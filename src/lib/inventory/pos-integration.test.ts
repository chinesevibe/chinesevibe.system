import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  buildPosConsumptionNotes,
  checkPosIntegrationRateLimit,
  extractIntegrationApiKey,
  isMatchingIntegrationApiKey,
  posConsumptionRequestSchema,
} from "@/lib/inventory/pos-integration"

describe("pos inventory integration helpers", () => {
  it("accepts x-api-key before bearer auth", () => {
    const headers = new Headers({
      authorization: "Bearer should-not-win",
      "x-api-key": "top-secret",
    })

    assert.equal(extractIntegrationApiKey(headers), "top-secret")
  })

  it("reads bearer token when x-api-key is absent", () => {
    const headers = new Headers({
      authorization: "Bearer machine-token",
    })

    assert.equal(extractIntegrationApiKey(headers), "machine-token")
  })

  it("compares api keys safely", () => {
    assert.equal(isMatchingIntegrationApiKey("top-secret", "top-secret"), true)
    assert.equal(
      isMatchingIntegrationApiKey("top-secret", "wrong-secret"),
      false
    )
    assert.equal(isMatchingIntegrationApiKey("top-secret", null), false)
  })

  it("rate limits repeated requests from the same ip", () => {
    const headers = new Headers({ "x-forwarded-for": "10.0.0.8" })
    const now = 1_000

    for (let count = 0; count < 60; count += 1) {
      assert.deepEqual(checkPosIntegrationRateLimit(headers, now), { ok: true })
    }

    assert.deepEqual(checkPosIntegrationRateLimit(headers, now), {
      ok: false,
      retryAfterSeconds: 60,
    })
    assert.deepEqual(checkPosIntegrationRateLimit(headers, now + 60_000), {
      ok: true,
    })
  })

  it("fills defaults and builds audit notes", () => {
    const payload = posConsumptionRequestSchema.parse({
      external_ref: "SALE-1001",
      branch_code: "BKK",
      warehouse_code: "MAIN",
      sold_at: "2026-06-25T12:00:00+07:00",
      notes: "Counter 3",
      items: [{ sku_code: "SKU-1", qty: 2 }],
    })

    assert.deepEqual(payload.items[0], {
      sku_code: "SKU-1",
      qty: 2,
      consumption_type: "production",
    })
    assert.equal(
      buildPosConsumptionNotes(payload),
      "pos:sale | ref=SALE-1001 | sold_at=2026-06-25T12:00:00+07:00 | Counter 3"
    )
  })
})
