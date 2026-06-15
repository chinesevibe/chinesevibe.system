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

const STATE_COOKIE = "line_login_state"

function publicOrigin(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  return configured || request.nextUrl.origin
}

function loginRedirect(request: NextRequest, error: string) {
  return NextResponse.redirect(
    new URL(`/login?error=${error}`, publicOrigin(request))
  )
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const state = request.nextUrl.searchParams.get("state")
  const stateCookie = request.cookies.get(STATE_COOKIE)?.value
  const origin = publicOrigin(request)

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return loginRedirect(request, "invalid_state")
  }

  let lineUserId: string
  try {
    const idToken = await exchangeCode(code)
    const payload = await verifyIdToken(idToken)
    lineUserId = payload.sub
  } catch (error) {
    console.error("LINE login failed", error)
    return loginRedirect(request, "line_login_failed")
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
    const response = NextResponse.redirect(new URL("/register", origin))
    response.cookies.set(LINE_REGISTER_COOKIE, lineUserId, LINE_REGISTER_COOKIE_OPTS)
    response.cookies.delete(STATE_COOKIE)
    return response
  }

  const role = employee.role as Parameters<typeof adminLoginPath>[0]
  const department =
    typeof employee.department === "string" ? employee.department : null
  const position =
    typeof employee.position === "string" ? employee.position : null
  const destination =
    employee.status === "active"
      ? requiresOfficerPortalPassword(department)
        ? "/login"
        : adminLoginPath(role, "active", department, position)
      : PENDING_REGISTRATION_PATH

  const response = NextResponse.redirect(new URL(destination, origin))

  try {
    await mintLineUserSession(request, response, lineUserId)
  } catch (error) {
    console.error("Supabase session mint failed", error)
    return loginRedirect(request, "session_failed")
  }

  response.cookies.delete(STATE_COOKIE)
  return response
}
