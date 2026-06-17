export type FefoLotCandidate = {
  lot_id: string
  lot_number: string
  expiry_date: string | null
  received_date: string
  remaining_qty: number
}

export type FefoAllocationLine = {
  lot_id: string
  lot_number: string
  expiry_date: string | null
  qty: number
}

/** Pure FEFO sort: expiry asc → received asc → lot_id asc. Excludes expired/damaged/depleted. */
export function sortLotsForFefo(
  lots: FefoLotCandidate[],
  todayIso: string,
  method: "fefo" | "fifo" | "manual" = "fefo"
): FefoLotCandidate[] {
  const available = lots.filter(
    (lot) =>
      lot.remaining_qty > 0 &&
      (method === "fifo" ||
        lot.expiry_date == null ||
        lot.expiry_date >= todayIso)
  )

  return [...available].sort((a, b) => {
    if (method === "fifo") {
      const rd = a.received_date.localeCompare(b.received_date)
      if (rd !== 0) return rd
      return a.lot_id.localeCompare(b.lot_id)
    }

    const aExp = a.expiry_date ?? "9999-12-31"
    const bExp = b.expiry_date ?? "9999-12-31"
    const exp = aExp.localeCompare(bExp)
    if (exp !== 0) return exp

    const rd = a.received_date.localeCompare(b.received_date)
    if (rd !== 0) return rd

    return a.lot_id.localeCompare(b.lot_id)
  })
}

/** Allocate qty across sorted lots (partial multi-lot). */
export function allocateFefoFromLots(
  lots: FefoLotCandidate[],
  qty: number,
  todayIso: string,
  method: "fefo" | "fifo" | "manual" = "fefo"
): FefoAllocationLine[] {
  if (qty <= 0) return []

  const sorted = sortLotsForFefo(lots, todayIso, method)
  let remaining = qty
  const lines: FefoAllocationLine[] = []

  for (const lot of sorted) {
    if (remaining <= 0) break
    const take = Math.min(lot.remaining_qty, remaining)
    if (take <= 0) continue
    lines.push({
      lot_id: lot.lot_id,
      lot_number: lot.lot_number,
      expiry_date: lot.expiry_date,
      qty: take,
    })
    remaining -= take
  }

  if (remaining > 0) {
    throw new Error(`insufficient lot stock (short by ${remaining})`)
  }

  return lines
}
