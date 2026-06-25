#!/usr/bin/env node
/**
 * Production smoke — role dashboard routes (no auth; expects redirect or 200).
 * Usage: node scripts/e2e/smoke-role-routes.mjs [baseUrl]
 */

const BASE = process.argv[2] ?? process.env.SMOKE_BASE_URL ?? "https://hr-app-rho-blush.vercel.app"

const ROUTES = [
  "/login",
  "/admin",
  "/admin/ceo",
  "/admin/branch",
  "/admin/branch/attendance",
  "/admin/branch/leaves",
  "/admin/branch/overtime",
  "/admin/branch/team",
]

async function check(path) {
  const url = `${BASE.replace(/\/$/, "")}${path}`
  const res = await fetch(url, { redirect: "manual" })
  const ok = res.status < 500
  return { path, status: res.status, ok }
}

async function main() {
  console.log(`Smoke role routes @ ${BASE}\n`)
  const results = []
  for (const path of ROUTES) {
    const r = await check(path)
    results.push(r)
    console.log(`${r.ok ? "✓" : "✗"} ${path} → ${r.status}`)
  }
  const failed = results.filter((r) => !r.ok)
  if (failed.length) {
    console.error(`\n${failed.length} route(s) returned 5xx`)
    process.exit(1)
  }
  console.log(`\nAll ${results.length} routes OK (no 5xx)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
