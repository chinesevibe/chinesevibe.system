"use client"

import { AuthLanguageSwitcher } from "@/components/auth/AuthLanguageSwitcher"
import {
  LocaleProvider,
  useLocale,
} from "@/features/portal/LocaleProvider"
import { PRODUCT_NAME } from "@/lib/brand/product"
import type { MessageKey } from "@/lib/i18n/translate"
import type { AppLocale } from "@/lib/i18n/types"

function AuthLoginBrandHeader() {
  return (
    <div className="bg-white px-6 py-10 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/mascot-hd.png"
        alt=""
        width={160}
        height={192}
        className="mx-auto h-auto w-32 object-contain"
        decoding="async"
      />
      <p
        className="mt-3 text-2xl font-bold tracking-tight text-brand-red"
        style={{ fontFamily: "var(--font-noto-sc), sans-serif" }}
      >
        {PRODUCT_NAME}
      </p>
      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.35em] text-brand-red/75">
        HR &amp; Payroll
      </p>
    </div>
  )
}

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
        <AuthLoginBrandHeader />
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
