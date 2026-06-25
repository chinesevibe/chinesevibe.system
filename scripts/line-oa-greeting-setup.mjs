#!/usr/bin/env node
/**
 * LINE OA Greeting setup helper — Console has no public API; this script:
 * 1. Verifies webhook + bot info
 * 2. Prints greeting text to paste in LINE Official Account Manager
 * 3. Opens manager.line.biz in your browser
 *
 * Usage: node scripts/line-oa-greeting-setup.mjs
 * Requires: LINE_CHANNEL_ACCESS_TOKEN in .env.local
 */

import { readFileSync, existsSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { execSync } from "node:child_process"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")

function loadEnvLocal() {
  const path = resolve(ROOT, ".env.local")
  if (!existsSync(path)) return
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
    }
  }
}

loadEnvLocal()

const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
const PRODUCTION_BASE =
  process.env.LINE_OA_PRODUCTION_BASE_URL?.replace(/\/$/, "") ??
  "https://hr-app-rho-blush.vercel.app"

/** Console greeting must use public HTTPS URLs (not ngrok). */
const consoleBaseUrl = PRODUCTION_BASE
const registerUrl = `${consoleBaseUrl}/register`

const greetingPath = resolve(ROOT, "scripts/line-oa-greeting-text.txt")
const greetingText = readFileSync(greetingPath, "utf8").trim()

console.log("=== CNV WorkHub — LINE OA Greeting Setup ===\n")

if (!token) {
  console.warn("⚠️  LINE_CHANNEL_ACCESS_TOKEN not found — skip API checks\n")
} else {
  const headers = { Authorization: `Bearer ${token}` }

  const whRes = await fetch("https://api.line.me/v2/bot/channel/webhook/endpoint", {
    headers,
  })
  const wh = await whRes.json().catch(() => ({}))
  console.log("Webhook URL:", wh.endpoint ?? wh.message ?? "—")

  const infoRes = await fetch("https://api.line.me/v2/bot/info", { headers })
  const info = await infoRes.json().catch(() => ({}))
  console.log("Bot:", info.displayName ?? "—", "|", info.userId ?? "—")
  console.log("")
}

console.log("--- ข้อความ Greeting ( copy ไปวางใน Console ) ---\n")
console.log(greetingText.replace("https://hr-app-rho-blush.vercel.app/register", registerUrl))
console.log("\n--- ขั้นตอนใน LINE Official Account Manager ---\n")
console.log(`1. เปิด https://manager.line.biz/ และ login
2. เลือก OA ของ CNV WorkHub
3. Settings → Response settings
   - Response mode: **Webhook**
   - เปิด Webhook · ปิด Auto-response
4. เมนูซ้าย → **Greeting message** → เปิดใช้ → วางข้อความ → Save
5. (Optional) แนบรูปคู่มือ URL:
   ${consoleBaseUrl}/line/register-guides/guide-th.jpg
   ${consoleBaseUrl}/line/register-guides/guide-zh.jpg
   ${consoleBaseUrl}/line/register-guides/guide-my.jpg

Webhook ส่งข้อความ+รูปเมื่อ add friend แล้ว (deploy 82882b3+)

ถ้าใช้ Greeting ใน Console แล้วไม่อยากข้อความซ้ำ:
  Vercel env LINE_OA_GREETING_IMAGES_ONLY=true
`)

const openUrl = "https://manager.line.biz/"
try {
  if (process.platform === "darwin") {
    execSync(`open "${openUrl}"`, { stdio: "ignore" })
    console.log(`\n✓ เปิดเบราว์เซอร์: ${openUrl}`)
  } else {
    console.log(`\nเปิดด้วยตนเอง: ${openUrl}`)
  }
} catch {
  console.log(`\nเปิดด้วยตนเอง: ${openUrl}`)
}
