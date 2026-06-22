"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"

import { LocaleProvider } from "@/features/portal/LocaleProvider"
import { isAppLocale, type AppLocale } from "@/lib/i18n/types"

/** Locale context for LIFF pages, synced with `?lang=` when present. */
export function LiffLocaleShell({
  initialLocale,
  children,
}: {
  initialLocale: AppLocale
  children: React.ReactNode
}) {
  const searchParams = useSearchParams()
  const locale = useMemo(() => {
    const urlLang = searchParams.get("lang")
    return isAppLocale(urlLang) ? urlLang : initialLocale
  }, [initialLocale, searchParams])

  return (
    <LocaleProvider initialLocale={locale} key={locale}>
      {children}
    </LocaleProvider>
  )
}
