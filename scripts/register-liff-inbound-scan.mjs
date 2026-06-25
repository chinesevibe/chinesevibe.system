#!/usr/bin/env node
/**
 * Register (or list) LIFF app for inbound barcode scan.
 *
 * Usage (prefer LINE Login channel — LIFF lives on login channel, not Messaging API bot):
 *   LINE_LOGIN_CHANNEL_ID=... LINE_LOGIN_CHANNEL_SECRET=... \
 *   NEXT_PUBLIC_BASE_URL=https://hr-app-rho-blush.vercel.app \
 *     node scripts/register-liff-inbound-scan.mjs
 *
 * Or pass LINE_CHANNEL_ACCESS_TOKEN for the login channel directly.
 *
 * After create, set NEXT_PUBLIC_LINE_LIFF_INBOUND_SCAN_ID=<liffId> on Vercel + redeploy.
 */
async function issueLoginChannelToken() {
  const clientId = process.env.LINE_LOGIN_CHANNEL_ID?.trim()
  const clientSecret = process.env.LINE_LOGIN_CHANNEL_SECRET?.trim()
  if (!clientId || !clientSecret) return undefined

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  })
  const res = await fetch("https://api.line.me/v2/oauth/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || `token issue failed ${res.status}`)
  }
  return json.access_token?.trim()
}

async function resolveToken() {
  const explicit = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim()
  if (explicit) return explicit
  return issueLoginChannelToken()
}

const baseUrl = (
  process.env.NEXT_PUBLIC_BASE_URL || "https://hr-app-rho-blush.vercel.app"
).replace(/\/$/, "")

const endpoint = `${baseUrl}/liff/inbound-scan`

async function listApps(token) {
  const res = await fetch("https://api.line.me/liff/v1/apps", {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body.message || `list failed ${res.status}`)
  }
  return body.apps ?? []
}

async function createApp(token) {
  const res = await fetch("https://api.line.me/liff/v1/apps", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      view: {
        type: "full",
        url: endpoint,
      },
      description: "HR inbound barcode scan",
      features: {
        ble: false,
        qrCode: true,
      },
      scope: ["profile", "openid"],
      botPrompt: "normal",
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body.message || `create failed ${res.status}`)
  }
  return body.liffId
}

async function main() {
  const token = await resolveToken()
  if (!token) {
    console.error(
      "Set LINE_CHANNEL_ACCESS_TOKEN or LINE_LOGIN_CHANNEL_ID + LINE_LOGIN_CHANNEL_SECRET"
    )
    process.exit(1)
  }

  console.log(`Endpoint: ${endpoint}`)
  const apps = await listApps(token)
  const existing = apps.find((a) => a.view?.url === endpoint)
  if (existing) {
    console.log(`LIFF app already exists: ${existing.liffId}`)
    console.log(`Set env: NEXT_PUBLIC_LINE_LIFF_INBOUND_SCAN_ID=${existing.liffId}`)
    return
  }

  const liffId = await createApp(token)
  console.log(`Created LIFF app: ${liffId}`)
  console.log(`Set env: NEXT_PUBLIC_LINE_LIFF_INBOUND_SCAN_ID=${liffId}`)
  console.log(
    `Scan URL example: https://liff.line.me/${liffId}/<order-uuid>`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
