#!/usr/bin/env node
/**
 * T63: LINE production checklist — webhook, bot info, env, Rich Menu URIs.
 * Usage: node scripts/line-prod-check.mjs
 */
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

function loadEnv() {
  for (const file of [".env.local", ".env.e2e.local"]) {
    const p = resolve(process.cwd(), file)
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
    }
  }
}

loadEnv()

const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
let failed = 0

function pass(label) {
  console.log(`✓ ${label}`)
}
function fail(label, detail = "") {
  failed += 1
  console.log(`✗ ${label}${detail ? ` — ${detail}` : ""}`)
}

console.log("=== LINE Production Checklist ===\n")

if (!token) fail("LINE_CHANNEL_ACCESS_TOKEN")
else pass("LINE_CHANNEL_ACCESS_TOKEN set")

if (!baseUrl) fail("NEXT_PUBLIC_BASE_URL")
else pass(`NEXT_PUBLIC_BASE_URL = ${baseUrl}`)

const expectedWebhook = baseUrl ? `${baseUrl.replace(/\/$/, "")}/api/line/webhook` : null

if (token) {
  const whRes = await fetch("https://api.line.me/v2/bot/channel/webhook/endpoint", {
    headers: { Authorization: `Bearer ${token}` },
  })
  const wh = await whRes.json().catch(() => ({}))
  if (expectedWebhook && wh.endpoint === expectedWebhook) {
    pass(`Webhook endpoint matches (${wh.endpoint})`)
  } else {
    fail("Webhook endpoint", `got ${wh.endpoint ?? wh.message ?? "—"}, want ${expectedWebhook}`)
  }

  const infoRes = await fetch("https://api.line.me/v2/bot/info", {
    headers: { Authorization: `Bearer ${token}` },
  })
  const info = await infoRes.json().catch(() => ({}))
  if (info.displayName) pass(`Bot: ${info.displayName}`)
  else fail("Bot info")

  const menuRes = await fetch("https://api.line.me/v2/bot/richmenu/list", {
    headers: { Authorization: `Bearer ${token}` },
  })
  const menus = await menuRes.json().catch(() => ({}))
  const count = menus.richmenus?.length ?? 0
  if (count > 0) pass(`Rich menus: ${count}`)
  else fail("Rich menus", "none found")
}

console.log(`\nResult: ${failed === 0 ? "PASS" : `FAIL (${failed} checks)`}`)
process.exit(failed === 0 ? 0 : 1)
