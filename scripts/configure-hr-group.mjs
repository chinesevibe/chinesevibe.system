#!/usr/bin/env node
/**
 * Set HR_LINE_GROUP_ID on Vercel (production) and Supabase edge secrets.
 *
 * Usage:
 *   node scripts/configure-hr-group.mjs <GROUP_ID>
 *
 * GROUP_ID format: Cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (32 hex chars)
 */

import { execSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const envPath = resolve(root, ".env.local")

function loadEnv() {
  try {
    const raw = readFileSync(envPath, "utf8")
    for (const line of raw.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq === -1) continue
      const key = trimmed.slice(0, eq)
      const value = trimmed.slice(eq + 1)
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    console.error("Missing .env.local")
    process.exit(1)
  }
}

const groupId = process.argv[2]
if (!groupId || !/^C[0-9a-f]{32}$/.test(groupId)) {
  console.error("Usage: node scripts/configure-hr-group.mjs Cxxxxxxxx...")
  process.exit(1)
}

loadEnv()

const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
if (!token) {
  console.error("LINE_CHANNEL_ACCESS_TOKEN not set")
  process.exit(1)
}

// Verify bot can reach the group before persisting config.
const summaryRes = await fetch(
  `https://api.line.me/v2/bot/group/${groupId}/summary`,
  { headers: { Authorization: `Bearer ${token}` } }
)
if (!summaryRes.ok) {
  const body = await summaryRes.text()
  console.error(`Group summary failed (${summaryRes.status}): ${body}`)
  console.error(
    "Ensure the OA bot is in the group and GROUP_ID is correct."
  )
  process.exit(1)
}
const summary = await summaryRes.json()
console.log("Group OK:", summary.groupName ?? summary)

execSync(
  `printf '%s' '${groupId}' | vercel env add HR_LINE_GROUP_ID production --force --yes`,
  { cwd: root, stdio: "inherit" }
)

const projectRef = "oouswalwqhojpzqwwdvs"
execSync(
  `supabase secrets set --project-ref ${projectRef} HR_LINE_GROUP_ID='${groupId}'`,
  { cwd: root, stdio: "inherit" }
)

console.log("\n✅ HR_LINE_GROUP_ID configured:")
console.log("  Vercel production:", groupId)
console.log("  Supabase secrets:", groupId)
console.log("\nRedeploy production for Next.js to pick up the env var:")
console.log("  vercel --prod")
