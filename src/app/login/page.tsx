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
import { getCurrentEmployee } from "@/lib/auth/session"
import { coerceLocale, LOCALE_COOKIE } from "@/lib/i18n/types"
import { createClient } from "@/lib/supabase/server"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

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

  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value
  const initialLocale = coerceLocale(
    cookieLocale ?? employee?.preferred_locale
  )

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
      lineStartUrl="/api/auth/line/start"
      showOfficerPasswordForm={showOfficerPasswordForm}
    />
  )
}
