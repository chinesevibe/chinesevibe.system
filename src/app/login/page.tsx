import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import {
  ERROR_KEYS,
  LoginPageContent,
} from "@/features/auth/LoginPageContent"
import { requiresOfficerPortalPassword } from "@/lib/auth/department-access"
import {
  OFFICER_PORTAL_VERIFIED_COOKIE,
  isOfficerPasswordVerified,
} from "@/lib/auth/officer-password-session"
import { adminLoginPath } from "@/lib/auth/roles"
import { sanitizeReturnTo } from "@/lib/navigation/return-to"
import { getCurrentEmployee } from "@/lib/auth/session"
import { coerceLocale, LOCALE_COOKIE, type AppLocale } from "@/lib/i18n/types"
import { createClient } from "@/lib/supabase/server"

function buildLineStartUrl(locale: AppLocale, next?: string | null): string {
  const params = new URLSearchParams({ lang: locale })
  if (next) params.set("next", next)
  return `/api/auth/line/start?${params.toString()}`
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; lang?: string; next?: string }>
}) {
  const { error, lang, next } = await searchParams
  const nextPath = sanitizeReturnTo(next)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const employee = user ? await getCurrentEmployee() : null
  const dashboardPath = employee
    ? adminLoginPath(
        employee.role,
        employee.status,
        employee.department,
        employee.position
      )
    : null

  const cookieStore = await cookies()
  const initialLocale = coerceLocale(
    lang ?? cookieStore.get(LOCALE_COOKIE)?.value ?? employee?.preferred_locale
  )
  const officerPasswordRequired = employee
    ? requiresOfficerPortalPassword(employee.department)
    : false
  const officerPasswordVerified = employee
    ? isOfficerPasswordVerified(
        cookieStore.get(OFFICER_PORTAL_VERIFIED_COOKIE)?.value,
        employee.id
      )
    : false
  const showOfficerPasswordForm =
    Boolean(employee) && officerPasswordRequired && !officerPasswordVerified

  if (
    employee &&
    !error &&
    dashboardPath &&
    (!officerPasswordRequired || officerPasswordVerified)
  ) {
    redirect(dashboardPath)
  }

  const errorMessageKey = error
    ? (ERROR_KEYS[error] ?? ERROR_KEYS.line_login_failed)
    : undefined

  return (
    <LoginPageContent
      initialLocale={initialLocale}
      error={error}
      errorMessageKey={errorMessageKey}
      hasEmployee={Boolean(employee)}
      hasUser={Boolean(user)}
      lineStartUrl={buildLineStartUrl(initialLocale, nextPath)}
      showOfficerPasswordForm={showOfficerPasswordForm}
    />
  )
}
