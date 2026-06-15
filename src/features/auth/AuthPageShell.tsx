"use client"

import { BrandMark } from "@/components/brand/BrandMark"
import { AuthLanguageSwitcher } from "@/components/auth/AuthLanguageSwitcher"
import {
  LocaleProvider,
  useLocale,
} from "@/features/portal/LocaleProvider"
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
        <div className="relative overflow-hidden bg-brand-red px-6 py-10 text-center text-white">
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 20%, #fff 0, transparent 45%), radial-gradient(circle at 80% 80%, #fff 0, transparent 40%)",
            }}
          />
          <div className="relative">
            <BrandMark variant="login" onDark />
            <p className="mt-4 text-sm font-medium text-white/90">{tx(titleKey)}</p>
          </div>
        </div>
        <div className="space-y-4 p-6">
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
