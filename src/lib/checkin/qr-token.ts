// Day-bound QR check-in token (T11).
// token = base64url("<empId>.<ICT date>") + "." + HMAC-SHA256(payload, LINE_CHANNEL_SECRET)
// - Signed server-side only (secret never leaves the server).
// - Valid for one ICT calendar day → a photographed QR replays at most that day,
//   and the T07 duplicate guard limits it to a single check-in.
import { createHmac, timingSafeEqual } from "node:crypto"

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000

export function ictDateString(now: Date = new Date()): string {
  const ictMs = now.getTime() + ICT_OFFSET_MS
  return new Date(ictMs).toISOString().slice(0, 10)
}

function requireSecret(): string {
  const secret = process.env.LINE_CHANNEL_SECRET
  if (!secret) {
    throw new Error("LINE_CHANNEL_SECRET is not set")
  }
  return secret
}

function sign(payload: string): Buffer {
  return createHmac("sha256", requireSecret()).update(payload).digest()
}

export function createCheckinToken(
  employeeId: string,
  now: Date = new Date()
): string {
  const payload = `${employeeId}.${ictDateString(now)}`
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload).toString("base64url")}`
}

export type TokenVerification =
  | { valid: true; employeeId: string }
  | { valid: false; reason: "malformed" | "bad_signature" | "expired" }

export function verifyCheckinToken(
  token: string,
  now: Date = new Date()
): TokenVerification {
  const parts = token.split(".")
  if (parts.length !== 2) {
    return { valid: false, reason: "malformed" }
  }

  let payload: string
  let givenSig: Buffer
  try {
    payload = Buffer.from(parts[0], "base64url").toString()
    givenSig = Buffer.from(parts[1], "base64url")
  } catch {
    return { valid: false, reason: "malformed" }
  }

  const expectedSig = sign(payload)
  if (
    givenSig.length !== expectedSig.length ||
    !timingSafeEqual(givenSig, expectedSig)
  ) {
    return { valid: false, reason: "bad_signature" }
  }

  const splitAt = payload.lastIndexOf(".")
  if (splitAt <= 0) {
    return { valid: false, reason: "malformed" }
  }
  const employeeId = payload.slice(0, splitAt)
  const date = payload.slice(splitAt + 1)

  if (date !== ictDateString(now)) {
    return { valid: false, reason: "expired" }
  }

  return { valid: true, employeeId }
}
