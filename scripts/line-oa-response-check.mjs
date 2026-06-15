#!/usr/bin/env node
/**
 * Diagnose LINE OA response mode — auto-replies in groups usually mean
 * "Chat" mode or greeting/auto-response is ON in LINE Official Account Manager.
 *
 * Usage: node scripts/line-oa-response-check.mjs
 * Requires: LINE_CHANNEL_ACCESS_TOKEN in env or .env.local
 */

import { readFileSync } from "node:fs"
import { resolve } from "node:path"

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
      }
    }
  } catch {
    // optional
  }
}

loadEnvLocal()

const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
if (!token) {
  console.error("Missing LINE_CHANNEL_ACCESS_TOKEN")
  process.exit(1)
}

const res = await fetch("https://api.line.me/v2/bot/channel/webhook/endpoint", {
  headers: { Authorization: `Bearer ${token}` },
})
const webhook = await res.json().catch(() => ({}))

console.log("=== LINE OA response check ===\n")
console.log("Webhook endpoint:", webhook.endpoint ?? webhook.message ?? webhook)

const infoRes = await fetch("https://api.line.me/v2/bot/info", {
  headers: { Authorization: `Bearer ${token}` },
})
const info = await infoRes.json().catch(() => ({}))
console.log("Bot display name:", info.displayName ?? "—")
console.log("Bot userId:", info.userId ?? "—")

console.log(`
If the HR group still gets auto-replies like:
  "ขอบคุณที่ส่งข้อความถึงเรา ต้องขออภัย..."

That text is from LINE Official Account Manager (NOT our webhook).

Fix in LINE Official Account Manager (manager.line.biz):
  1. Settings → Messaging API → Response settings
  2. Set mode to **Webhook** (ปิด Chat / Bot mode)
  3. Settings → Response → turn OFF:
     - Greeting message (ข้อความทักทาย)
     - Auto-response message (ข้อความตอบกลับอัตโนมัติ)
  4. Under group chat: do not enable "reply to all messages"

Our app only **pushes** HR reports to the group (notifyHr).
Webhook now ignores group message/postback/follow events.
Ensure Vercel env: LINE_USER_CHAT_ENABLED=false (or unset).
`)
