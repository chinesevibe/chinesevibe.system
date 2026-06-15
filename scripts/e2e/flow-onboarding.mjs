#!/usr/bin/env node
/**
 * Onboarding flow checklist (T83) — manual + HTTP smoke.
 *
 * Full LINE OAuth cannot run headless; this script verifies routes/API exist.
 *
 * Usage:
 *   node scripts/e2e/flow-onboarding.mjs
 *   BASE_URL=https://hr-app-two-iota.vercel.app node scripts/e2e/flow-onboarding.mjs
 */

const base = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "")

const checks = [
  { name: "login page", path: "/login", expect: [200, 307] },
  { name: "register redirect (no cookie)", path: "/register", expect: [200, 307] },
  { name: "register API (no cookie → 401)", path: "/api/auth/register", method: "POST", expect: [401] },
  { name: "employees admin", path: "/admin/employees", expect: [200, 307] },
  { name: "LIFF leave", path: "/liff/leave", expect: [200, 307] },
]

let failed = 0

for (const c of checks) {
  try {
    const res = await fetch(`${base}${c.path}`, {
      method: c.method ?? "GET",
      redirect: "manual",
      headers: c.method === "POST" ? { "content-type": "application/json" } : undefined,
      body: c.method === "POST" ? JSON.stringify({ name: "Test" }) : undefined,
    })
    const ok = c.expect.includes(res.status)
    console.log(`${ok ? "✓" : "✗"} ${c.name} → ${res.status}`)
    if (!ok) failed++
  } catch (err) {
    console.log(`✗ ${c.name} → ${err instanceof Error ? err.message : err}`)
    failed++
  }
}

console.log("")
console.log("Manual steps (LINE required):")
console.log("  1. Login LINE with new account → /register")
console.log("  2. Submit name → /liff/leave")
console.log("  3. HR: /admin/employees?status=onboarding → assign role + branch")
console.log("  4. Re-login → landing matches role")

process.exit(failed ? 1 : 0)
