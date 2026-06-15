import { randomBytes } from "node:crypto"

import { NextResponse, type NextRequest } from "next/server"

import { buildAuthorizeUrl } from "@/lib/auth/line-login"

const STATE_COOKIE = "line_login_state"

function isSecureRequest(request: NextRequest): boolean {
  const forwarded = request.headers.get("x-forwarded-proto")
  if (forwarded === "https") return true
  return request.nextUrl.protocol === "https:"
}

export async function GET(request: NextRequest) {
  const state = randomBytes(16).toString("hex")

  const response = NextResponse.redirect(buildAuthorizeUrl(state))
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(request) || process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  })
  return response
}
