"use client"

import Link from "next/link"

import { Button, buttonVariants } from "@/components/ui/button"
import { AuthPageShell } from "@/features/auth/AuthPageShell"
import { EmployeeCodeLoginForm } from "@/features/auth/EmployeeCodeLoginForm"
import { useLocale } from "@/features/portal/LocaleProvider"
import type { MessageKey } from "@/lib/i18n/translate"
import type { AppLocale } from "@/lib/i18n/types"
import { cn } from "@/lib/utils"

const ERROR_KEYS: Record<string, MessageKey> = {
  forbidden: "auth.login.error.forbidden",
  invalid_state: "auth.login.error.invalid_state",
  line_login_failed: "auth.login.error.line_login_failed",
  invalid_credentials: "auth.login.error.invalid_credentials",
  portal_login_failed: "auth.login.error.portal_login_failed",
  session_failed: "auth.login.error.session_failed",
}

type LoginPageBodyProps = {
  error?: string
  errorMessageKey?: MessageKey
  dashboardPath: string | null
  hasEmployee: boolean
  hasUser: boolean
  lineStartUrl: string
}

function LoginPageBody({
  error,
  errorMessageKey,
  dashboardPath,
  hasEmployee,
  hasUser,
  lineStartUrl,
}: LoginPageBodyProps) {
  const { tx } = useLocale()
  const errorMessage = errorMessageKey ? tx(errorMessageKey) : null
  const showLoginForm = !hasEmployee || Boolean(error)

  return (
    <>
      <p className="text-center text-sm text-muted-foreground">
        {tx("auth.login.subtitle")}
      </p>
      {errorMessage ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      {hasEmployee && dashboardPath ? (
        <Link
          href={dashboardPath}
          className={cn(
            buttonVariants({ size: "default" }),
            "w-full bg-brand-red text-white hover:bg-brand-red/90"
          )}
        >
          {tx("auth.login.dashboard")}
        </Link>
      ) : null}
      {error === "not_registered" ? (
        <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {tx("auth.login.notRegisteredHint")}
        </p>
      ) : null}
      {showLoginForm ? <EmployeeCodeLoginForm /> : null}
      {showLoginForm ? (
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
