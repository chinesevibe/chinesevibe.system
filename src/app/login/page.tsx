import { cookies } from "next/headers"

import {
  ERROR_KEYS,
  LoginPageContent,
} from "@/features/auth/LoginPageContent"
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
  const employee = user && !error ? await getCurrentEmployee() : null
  const dashboardPath = employee
    ? adminLoginPath(
        employee.role,
        employee.status,
        employee.department,
        employee.position
      )
    : null

  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value
  const initialLocale = coerceLocale(
    cookieLocale ?? employee?.preferred_locale
  )

  const errorMessageKey = error
    ? (ERROR_KEYS[error] ?? ERROR_KEYS.line_login_failed)
    : undefined

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  const lineStartUrl = baseUrl
    ? `${baseUrl}/api/auth/line/start`
    : "/api/auth/line/start"

  return (
    <LoginPageContent
      initialLocale={initialLocale}
      error={error}
      errorMessageKey={errorMessageKey}
      dashboardPath={dashboardPath}
      hasEmployee={Boolean(employee)}
      hasUser={Boolean(user)}
      lineStartUrl={lineStartUrl}
    />
  )
}
