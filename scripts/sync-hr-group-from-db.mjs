#!/usr/bin/env node
/**
 * Read captured LINE group id from Supabase and configure env vars.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \\
 *     node scripts/sync-hr-group-from-db.mjs
 */

import { execSync } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { loadEnv } from "./test-helpers/env.mjs"
import { getSupabaseAdmin } from "./test-helpers/supabase-admin.mjs"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
loadEnv()

const admin = getSupabaseAdmin()
const { data, error } = await admin
  .from("hr_runtime_config")
  .select("value")
  .eq("key", "hr_line_group_id")
  .maybeSingle()

if (error) {
  console.error("DB read failed:", error.message)
  process.exit(1)
}

const groupId = data?.value
if (!groupId) {
  console.error(
    "No group id captured yet. Send any message in the HR LINE group, then retry."
  )
  process.exit(1)
}

console.log("Captured group id:", groupId)
execSync(`node scripts/configure-hr-group.mjs ${groupId}`, {
  cwd: root,
  stdio: "inherit",
})
