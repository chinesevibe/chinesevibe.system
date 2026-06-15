import { createHmac, timingSafeEqual } from "crypto"
import type { NextResponse } from "next/server"

export const OFFICER_PORTAL_VERIFIED_COOKIE = "officer_portal_verified"

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12

function signingSecret(): string {
  const secret =
    process.env.OFFICER_PORTAL_COOKIE_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!secret) {
    throw new Error("OFFICER_PORTAL_COOKIE_SECRET or SUPABASE_SERVICE_ROLE_KEY is required")
  }
  return secret
}

function signEmployeeId(employeeId: string): string {
  const signature = createHmac("sha256", signingSecret())
    .update(employeeId)
    .digest("hex")
  return `${employeeId}.${signature}`
}

function parseVerifiedEmployeeId(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null
  const dot = cookieValue.lastIndexOf(".")
  if (dot <= 0) return null

  const employeeId = cookieValue.slice(0, dot)
  const signature = cookieValue.slice(dot + 1)
  const expected = createHmac("sha256", signingSecret())
    .update(employeeId)
    .digest("hex")

  try {
    const a = Buffer.from(signature, "hex")
    const b = Buffer.from(expected, "hex")
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }

  return employeeId
}

export function isOfficerPasswordVerified(
  cookieValue: string | undefined,
  employeeId: string
): boolean {
  const verifiedId = parseVerifiedEmployeeId(cookieValue)
  return verifiedId === employeeId
}

export function setOfficerPasswordVerifiedCookie(
  response: NextResponse,
  employeeId: string
): void {
  response.cookies.set(OFFICER_PORTAL_VERIFIED_COOKIE, signEmployeeId(employeeId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  })
}

export function clearOfficerPasswordVerifiedCookie(response: NextResponse): void {
  response.cookies.set(OFFICER_PORTAL_VERIFIED_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
}
