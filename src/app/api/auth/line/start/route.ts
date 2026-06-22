import { randomBytes } from "node:crypto"

import { NextResponse, type NextRequest } from "next/server"

import { buildAuthorizeUrl } from "@/lib/auth/line-login"
import { isAppLocale } from "@/lib/i18n/types"
import { sanitizeReturnTo } from "@/lib/navigation/return-to"

const STATE_COOKIE = "line_login_state"
const LANG_COOKIE = "line_login_lang"
const NEXT_COOKIE = "line_login_next"

function isSecureRequest(request: NextRequest): boolean {
  const forwarded = request.headers.get("x-forwarded-proto")
  if (forwarded === "https") return true
  return request.nextUrl.protocol === "https:"
}

export async function GET(request: NextRequest) {
  const state = randomBytes(16).toString("hex")
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isSecureRequest(request) || process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  }
  const lang = request.nextUrl.searchParams.get("lang")
  const next = sanitizeReturnTo(request.nextUrl.searchParams.get("next"))

  const response = NextResponse.redirect(buildAuthorizeUrl(state, request.nextUrl.origin))
  response.cookies.set(STATE_COOKIE, state, cookieOptions)
  if (next) {
    response.cookies.set(NEXT_COOKIE, next, cookieOptions)
  } else {
    response.cookies.delete(NEXT_COOKIE)
  }
  if (isAppLocale(lang)) {
    response.cookies.set(LANG_COOKIE, lang, cookieOptions)
  } else {
    response.cookies.delete(LANG_COOKIE)
  }
  return response
}
