"use client"

import { Button } from "@/components/ui/button"
import { AuthPageShell } from "@/features/auth/AuthPageShell"
import { EmployeeCodeLoginForm } from "@/features/auth/EmployeeCodeLoginForm"
import { OfficerPasswordVerifyForm } from "@/features/auth/OfficerPasswordVerifyForm"
import { useLocale } from "@/features/portal/LocaleProvider"
import type { MessageKey } from "@/lib/i18n/translate"
import type { AppLocale } from "@/lib/i18n/types"

const ERROR_KEYS: Record<string, MessageKey> = {
  forbidden: "auth.login.error.forbidden",
  invalid_state: "auth.login.error.invalid_state",
  line_login_failed: "auth.login.error.line_login_failed",
  invalid_credentials: "auth.login.error.invalid_credentials",
  portal_login_failed: "auth.login.error.portal_login_failed",
  session_failed: "auth.login.error.session_failed",
  password_required: "auth.login.error.password_required",
}

type LoginPageBodyProps = {
  error?: string
  errorMessageKey?: MessageKey
  hasEmployee: boolean
  hasUser: boolean
  lineStartUrl: string
  showOfficerPasswordForm: boolean
}

function LoginPageBody({
  error,
  errorMessageKey,
  hasEmployee,
  hasUser,
  lineStartUrl,
  showOfficerPasswordForm,
}: LoginPageBodyProps) {
  const { tx } = useLocale()
  const errorMessage = errorMessageKey ? tx(errorMessageKey) : null
  const showGuestLoginForm = !hasEmployee
  const showRegisterLink = !hasEmployee

  return (
    <>
      <p className="text-center text-sm text-muted-foreground">
        {showOfficerPasswordForm
          ? tx("auth.login.officerSubtitle")
          : tx("auth.login.subtitle")}
      </p>
      {errorMessage ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      {error === "not_registered" ? (
        <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {tx("auth.login.notRegisteredHint")}
        </p>
      ) : null}
      {showOfficerPasswordForm ? <OfficerPasswordVerifyForm /> : null}
      {showGuestLoginForm ? <EmployeeCodeLoginForm /> : null}
      {showRegisterLink ? (
        <p className="text-center text-xs text-muted-foreground">
          <a
            href={lineStartUrl}
            className="text-brand-red underline-offset-2 hover:underline"
          >
            {tx("auth.login.registerLink")}
          </a>
        </p>
      ) : null}
      {hasUser || error ? (
        <form action="/api/auth/logout" method="post">
          <Button type="submit" variant="outline" className="w-full">
            {tx("auth.login.clearSession")}
          </Button>
        </form>
      ) : null}
    </>
  )
}

export function LoginPageContent({
  initialLocale,
  ...bodyProps
}: LoginPageBodyProps & { initialLocale: AppLocale }) {
  return (
    <AuthPageShell
      initialLocale={initialLocale}
      titleKey="auth.login.title"
      maxWidth="max-w-sm"
    >
      <LoginPageBody {...bodyProps} />
    </AuthPageShell>
  )
}

export { ERROR_KEYS }
