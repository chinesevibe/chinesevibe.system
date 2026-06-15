#!/usr/bin/env node
/**
 * T14 — unit checks for profile helpers (no DB required).
 */
import assert from "node:assert/strict"

// Inline copies of pure logic for script portability
function daysBetween(from, to) {
  const DAY_MS = 86_400_000
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS
  )
}

function deriveExpiryStatus(expiry, today, windowDays = 30) {
  if (!expiry) return "none"
  if (expiry < today) return "expired"
  if (daysBetween(today, expiry) <= windowDays) return "expiring"
  return "ok"
}

function deriveProbationStatus(status, probationEnd, today) {
  if (status !== "active" || !probationEnd) return "not_applicable"
  return probationEnd >= today ? "pending" : "passed"
}

const today = "2026-06-11"

assert.equal(deriveExpiryStatus(null, today), "none")
assert.equal(deriveExpiryStatus("2026-05-01", today), "expired")
assert.equal(deriveExpiryStatus("2026-06-20", today), "expiring")
assert.equal(deriveExpiryStatus("2026-12-31", today), "ok")

assert.equal(deriveProbationStatus("active", "2026-07-01", today), "pending")
assert.equal(deriveProbationStatus("active", "2026-06-01", today), "passed")
assert.equal(deriveProbationStatus("inactive", "2026-12-01", today), "not_applicable")

console.log("test-employee-profile: 7/7 assertions passed")
