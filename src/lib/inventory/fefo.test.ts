import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  allocateFefoFromLots,
  sortLotsForFefo,
  type FefoLotCandidate,
} from "@/lib/inventory/fefo"

const TODAY = "2026-06-17"

function lot(
  id: string,
  expiry: string | null,
  received: string,
  remaining: number
): FefoLotCandidate {
  return {
    lot_id: id,
    lot_number: `LOT-${id}`,
    expiry_date: expiry,
    received_date: received,
    remaining_qty: remaining,
  }
}

describe("sortLotsForFefo", () => {
  it("picks earliest expiry first", () => {
    const sorted = sortLotsForFefo(
      [
        lot("b", "2026-07-20", "2026-06-01", 10),
        lot("a", "2026-07-10", "2026-06-01", 10),
      ],
      TODAY
    )
    assert.deepEqual(
      sorted.map((l) => l.lot_id),
      ["a", "b"]
    )
  })

  it("excludes expired lots", () => {
    const sorted = sortLotsForFefo(
      [
        lot("expired", "2026-06-01", "2026-05-01", 10),
        lot("ok", "2026-06-30", "2026-06-01", 10),
      ],
      TODAY
    )
    assert.deepEqual(
      sorted.map((l) => l.lot_id),
      ["ok"]
    )
  })
})

describe("allocateFefoFromLots", () => {
  it("splits across multiple lots", () => {
    const lines = allocateFefoFromLots(
      [
        lot("a", "2026-07-10", "2026-06-01", 10),
        lot("b", "2026-07-20", "2026-06-01", 10),
      ],
      15,
      TODAY
    )
    assert.equal(lines[0]?.lot_id, "a")
    assert.equal(lines[0]?.qty, 10)
    assert.equal(lines[1]?.lot_id, "b")
    assert.equal(lines[1]?.qty, 5)
  })
})
