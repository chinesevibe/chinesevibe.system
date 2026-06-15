"use client"

import { useState } from "react"

import { LocaleProvider } from "@/features/portal/LocaleProvider"
import { isAppLocale, type AppLocale } from "@/lib/i18n/types"

function resolveLiffLocale(initialLocale: AppLocale): AppLocale {
  if (typeof window === "undefined") return initialLocale
  const urlLang = new URLSearchParams(window.location.search).get("lang")
  return isAppLocale(urlLang) ? urlLang : initialLocale
}

/** Read-only locale context for LIFF pages (no language switcher). */
export function LiffLocaleShell({
  initialLocale,
  children,
}: {
  initialLocale: AppLocale
  children: React.ReactNode
}) {
  const [locale] = useState(() => resolveLiffLocale(initialLocale))

  return (
    <LocaleProvider initialLocale={locale} key={locale}>
      {children}
    </LocaleProvider>
  )
}
