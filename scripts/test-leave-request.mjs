#!/usr/bin/env node
/**
 * T17 — unit checks for leave request balance helpers (no DB required).
 */
import assert from "node:assert/strict"

const DAY_MS = 86_400_000

function countLeaveDays(startDate, endDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return null
  const start = Date.parse(`${startDate}T00:00:00Z`)
  const end = Date.parse(`${endDate}T00:00:00Z`)
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null
  return Math.round((end - start) / DAY_MS) + 1
}

function snapshotFromRow(row) {
  const total = Number(row.total_days)
  const used = Number(row.used_days)
  return { total, used, remaining: total - used }
}

function canRequestLeave(remaining, requestedDays) {
  return remaining >= requestedDays
}

function insufficientBalanceMessage(remaining, requestedDays) {
  return `ยอดลาคงเหลือไม่เพียงพอ (เหลือ ${remaining} วัน ต้องการ ${requestedDays} วัน)`
}

function formatLeaveApiError(body) {
  if (body?.message) return body.message
  const map = {
    no_balance: "ไม่พบยอดลาสำหรับประเภทนี้ กรุณาติดต่อ HR",
    insufficient_balance: "ยอดลาคงเหลือไม่เพียงพอ",
  }
  if (body?.error && map[body.error]) return map[body.error]
  return "ส่งใบลาไม่สำเร็จ"
}

// countLeaveDays
assert.equal(countLeaveDays("2026-06-10", "2026-06-10"), 1)
assert.equal(countLeaveDays("2026-06-10", "2026-06-12"), 3)
assert.equal(countLeaveDays("2026-06-12", "2026-06-10"), null)

// snapshot + canRequest
const snap = snapshotFromRow({ total_days: 10, used_days: 3 })
assert.equal(snap.remaining, 7)
assert.equal(canRequestLeave(snap.remaining, 7), true)
assert.equal(canRequestLeave(snap.remaining, 8), false)

// messages
assert.match(
  insufficientBalanceMessage(2, 5),
  /เหลือ 2 วัน ต้องการ 5 วัน/
)
assert.equal(
  formatLeaveApiError({ error: "insufficient_balance", message: "custom" }),
  "custom"
)
assert.equal(
  formatLeaveApiError({ error: "no_balance" }),
  "ไม่พบยอดลาสำหรับประเภทนี้ กรุณาติดต่อ HR"
)
assert.equal(formatLeaveApiError(null), "ส่งใบลาไม่สำเร็จ")

console.log("test-leave-request: 10/10 assertions passed")
