import { NextResponse, type NextRequest } from "next/server"

import { getAdminClient } from "@/lib/auth/admin-client"
import { PENDING_REGISTRATION_PATH } from "@/lib/auth/employee-access"
import { requiresOfficerPortalPassword } from "@/lib/auth/department-access"
import { syncLocaleFromLineApp } from "@/lib/i18n/employee-locale"
import { mintLineUserSession } from "@/lib/auth/line-session"
import { adminLoginPath } from "@/lib/auth/roles"
import {
  LINE_REGISTER_COOKIE,
  LINE_REGISTER_COOKIE_OPTS,
} from "@/lib/auth/register-cookie"
import { exchangeCode, verifyIdToken } from "@/lib/auth/line-login"
import {
  isAppLocale,
  LOCALE_COOKIE,
  type AppLocale,
} from "@/lib/i18n/types"
import { sanitizeReturnTo } from "@/lib/navigation/return-to"

const STATE_COOKIE = "line_login_state"
const LANG_COOKIE = "line_login_lang"
const NEXT_COOKIE = "line_login_next"

function publicOrigin(request: NextRequest): string {
  const hostname = request.nextUrl.hostname
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return request.nextUrl.origin
  }
  const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  return configured || request.nextUrl.origin
}

function withLocale(path: string, locale?: AppLocale): string {
  if (!locale) return path
  const url = new URL(path, "http://localhost")
  if (!url.searchParams.has("lang")) {
    url.searchParams.set("lang", locale)
  }
  const query = url.searchParams.toString()
  return `${url.pathname}${query ? `?${query}` : ""}${url.hash}`
}

function finalizeAuthResponse(
  response: NextResponse,
  locale?: AppLocale
): NextResponse {
  if (locale) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })
  }
  response.cookies.delete(STATE_COOKIE)
  response.cookies.delete(LANG_COOKIE)
  response.cookies.delete(NEXT_COOKIE)
  return response
}

function readRequestedLocale(request: NextRequest): AppLocale | undefined {
  const value = request.cookies.get(LANG_COOKIE)?.value
  return isAppLocale(value) ? value : undefined
}

function readRequestedNext(request: NextRequest): string | null {
  const next = sanitizeReturnTo(request.cookies.get(NEXT_COOKIE)?.value)
  if (!next || next.startsWith("/login") || next.startsWith("/register")) {
    return null
  }
  return next
}

function loginRedirect(
  request: NextRequest,
  error: string,
  locale?: AppLocale
) {
  return finalizeAuthResponse(
    NextResponse.redirect(
      new URL(withLocale(`/login?error=${error}`, locale), publicOrigin(request))
    ),
    locale
  )
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const state = request.nextUrl.searchParams.get("state")
  const stateCookie = request.cookies.get(STATE_COOKIE)?.value
  const origin = publicOrigin(request)
  const requestedLocale = readRequestedLocale(request)
  const requestedNext = readRequestedNext(request)

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return loginRedirect(request, "invalid_state", requestedLocale)
  }

  let lineUserId: string
  try {
    const idToken = await exchangeCode(code)
    const payload = await verifyIdToken(idToken)
    lineUserId = payload.sub
  } catch (error) {
    console.error("LINE login failed", error)
    return loginRedirect(request, "line_login_failed", requestedLocale)
  }

  const admin = getAdminClient()

  const { data: employee } = await admin
    .from("hr_employees")
    .select("id, role, status, department, position, locale_source")
    .eq("line_user_id", lineUserId)
    .maybeSingle()

  if (employee?.id && employee.locale_source !== "manual") {
    const acceptLanguage = request.headers.get("accept-language")
    const lineLang = acceptLanguage?.split(",")[0]?.trim()
    if (lineLang) {
      await syncLocaleFromLineApp({
        employeeId: employee.id as string,
        lineLanguage: lineLang,
      }).catch((err) => console.error("locale sync on LINE login:", err))
    }
  }

  if (!employee) {
    const response = NextResponse.redirect(
      new URL(withLocale("/register", requestedLocale), origin)
    )
    response.cookies.set(LINE_REGISTER_COOKIE, lineUserId, LINE_REGISTER_COOKIE_OPTS)
    return finalizeAuthResponse(response, requestedLocale)
  }

  const role = employee.role as Parameters<typeof adminLoginPath>[0]
  const department =
    typeof employee.department === "string" ? employee.department : null
  const position =
    typeof employee.position === "string" ? employee.position : null
  const officerPasswordRequired = requiresOfficerPortalPassword(department)
  const fallbackDestination =
    employee.status === "active"
      ? officerPasswordRequired
        ? "/login"
        : adminLoginPath(role, "active", department, position)
      : PENDING_REGISTRATION_PATH

  const destination =
    employee.status === "active" && requestedNext && !officerPasswordRequired
      ? withLocale(requestedNext, requestedLocale)
      : withLocale(fallbackDestination, requestedLocale)

  const responseUrl = new URL(destination, origin)
  if (
    employee.status === "active" &&
    officerPasswordRequired &&
    requestedNext &&
    !responseUrl.searchParams.has("next")
  ) {
    responseUrl.searchParams.set("next", requestedNext)
    if (requestedLocale && !responseUrl.searchParams.has("lang")) {
      responseUrl.searchParams.set("lang", requestedLocale)
    }
  }
  const response = NextResponse.redirect(responseUrl)

  try {
    await mintLineUserSession(request, response, lineUserId)
  } catch (error) {
    console.error("Supabase session mint failed", error)
    return loginRedirect(request, "session_failed", requestedLocale)
  }

  return finalizeAuthResponse(response, requestedLocale)
}
