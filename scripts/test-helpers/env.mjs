import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..")

function resolveEnvPath() {
  if (process.env.E2E_ENV_FILE) {
    return resolve(root, process.env.E2E_ENV_FILE)
  }
  if (process.env.E2E_REMOTE === "1" || process.env.E2E_REMOTE === "true") {
    const remote = resolve(root, ".env.e2e.local")
    if (existsSync(remote)) return remote
  }
  return resolve(root, ".env.local")
}

let loaded = false
let loadedPath = null

function loadFile(path) {
  const raw = readFileSync(path, "utf8")
  for (const line of raw.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

export function loadEnv() {
  if (loaded) return
  const envPath = resolveEnvPath()

  if (!existsSync(envPath)) {
    if (process.env.E2E_REMOTE === "1" || process.env.E2E_REMOTE === "true") {
      throw new Error(
        "Missing .env.e2e.local — run: node scripts/e2e/bootstrap-remote-env.mjs"
      )
    }
    throw new Error(`Missing ${envPath} — configure Supabase in hr-app/`)
  }

  loadFile(envPath)
  loaded = true
  loadedPath = envPath

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  if (url.includes("127.0.0.1") || url.includes("localhost")) {
    console.warn(
      `[e2e] WARNING: Supabase URL is local (${url}). ` +
        `Use E2E_REMOTE=1 after bootstrap-remote-env.mjs for remote tests.`
    )
  }
}

export function getLoadedEnvPath() {
  return loadedPath
}

export function requireEnv(...keys) {
  loadEnv()
  const missing = keys.filter((k) => !process.env[k])
  if (missing.length) {
    throw new Error(`Missing env: ${missing.join(", ")} (from ${loadedPath})`)
  }
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }
}
