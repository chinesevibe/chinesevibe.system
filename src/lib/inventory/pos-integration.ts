import { timingSafeEqual } from "node:crypto"

import { z } from "zod"

const optionalText = (max = 2000) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }, z.string().max(max).nullable().optional())

export const posConsumptionItemSchema = z.object({
  sku_code: z.string().trim().min(1, "sku_code required"),
  qty: z.coerce.number().positive("qty must be greater than 0"),
  consumption_type: z
    .enum(["production", "sampling", "testing"])
    .default("production"),
  notes: optionalText(1000),
})

export const posConsumptionRequestSchema = z.object({
  source_system: z.string().trim().min(1).max(80).default("pos"),
  event_type: z.string().trim().min(1).max(80).default("sale"),
  external_ref: z.string().trim().min(1).max(160),
  branch_code: z.string().trim().min(1).max(80),
  warehouse_code: z.string().trim().min(1).max(80),
  sold_at: optionalText(120),
  notes: optionalText(2000),
  items: z.array(posConsumptionItemSchema).min(1, "items required"),
})

export type PosConsumptionRequest = z.infer<typeof posConsumptionRequestSchema>

export function extractIntegrationApiKey(headers: Headers): string | null {
  const apiKey = headers.get("x-api-key")?.trim()
  if (apiKey) return apiKey

  const authorization = headers.get("authorization")?.trim()
  if (!authorization) return null

  const [scheme, token] = authorization.split(/\s+/, 2)
  if (scheme?.toLowerCase() !== "bearer") return null
  return token?.trim() || null
}

export function isMatchingIntegrationApiKey(
  expectedApiKey: string | null | undefined,
  providedApiKey: string | null
): boolean {
  if (!expectedApiKey || !providedApiKey) return false

  const expected = Buffer.from(expectedApiKey.trim())
  const provided = Buffer.from(providedApiKey.trim())

  if (expected.length !== provided.length) return false
  return timingSafeEqual(expected, provided)
}

type PosRateLimitState = { count: number; resetAt: number }

const POS_RATE_LIMIT_WINDOW_MS = 60_000
const POS_RATE_LIMIT_MAX_REQUESTS = 60
const posRateLimitByIp = new Map<string, PosRateLimitState>()

function getForwardedIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  if (forwardedFor) return forwardedFor

  const realIp = headers.get("x-real-ip")?.trim()
  if (realIp) return realIp

  return "unknown"
}

export function checkPosIntegrationRateLimit(
  headers: Headers,
  now = Date.now()
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const ip = getForwardedIp(headers)
  const existing = posRateLimitByIp.get(ip)

  if (!existing || existing.resetAt <= now) {
    posRateLimitByIp.set(ip, {
      count: 1,
      resetAt: now + POS_RATE_LIMIT_WINDOW_MS,
    })
    return { ok: true }
  }

  if (existing.count >= POS_RATE_LIMIT_MAX_REQUESTS) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000)
      ),
    }
  }

  existing.count += 1
  return { ok: true }
}

export function buildPosConsumptionNotes(payload: PosConsumptionRequest): string {
  const parts = [
    `${payload.source_system}:${payload.event_type}`,
    `ref=${payload.external_ref}`,
  ]

  if (payload.sold_at) parts.push(`sold_at=${payload.sold_at}`)
  if (payload.notes) parts.push(payload.notes)

  return parts.join(" | ")
}
