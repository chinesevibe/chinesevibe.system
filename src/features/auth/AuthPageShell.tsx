"use client"

import { AuthLanguageSwitcher } from "@/components/auth/AuthLanguageSwitcher"
import {
  LocaleProvider,
  useLocale,
} from "@/features/portal/LocaleProvider"
import { BRAND_LOGIN_HERO } from "@/lib/brand/assets"
import type { MessageKey } from "@/lib/i18n/translate"
import type { AppLocale } from "@/lib/i18n/types"

function AuthPageShellInner({
  titleKey,
  children,
  maxWidth = "max-w-md",
}: {
  titleKey: MessageKey
  children: React.ReactNode
  maxWidth?: "max-w-sm" | "max-w-md"
}) {
  const { tx } = useLocale()

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div
        className={`w-full ${maxWidth} overflow-hidden rounded-2xl border border-border/80 bg-card shadow-lg`}
      >
        <div className="overflow-hidden bg-brand-red">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BRAND_LOGIN_HERO}
            alt="CNV WorkHub — HR & Payroll"
            width={480}
            height={360}
            className="block h-auto w-full object-cover"
            decoding="async"
          />
        </div>
        <div className="space-y-4 p-6">
          <h1 className="text-center text-lg font-semibold text-foreground">
            {tx(titleKey)}
          </h1>
          <AuthLanguageSwitcher />
          {children}
        </div>
      </div>
    </main>
  )
}

export function AuthPageShell({
  initialLocale,
  titleKey,
  children,
  maxWidth = "max-w-md",
}: {
  initialLocale: AppLocale
  titleKey: MessageKey
  children: React.ReactNode
  maxWidth?: "max-w-sm" | "max-w-md"
}) {
  return (
    <LocaleProvider initialLocale={initialLocale} persistEndpoint="/api/locale">
      <AuthPageShellInner titleKey={titleKey} maxWidth={maxWidth}>
        {children}
      </AuthPageShellInner>
    </LocaleProvider>
  )
}
