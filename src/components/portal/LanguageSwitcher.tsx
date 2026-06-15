"use client"

import { Languages } from "lucide-react"

import { useLocale, APP_LOCALES } from "@/features/portal/LocaleProvider"
import type { AppLocale } from "@/lib/i18n/types"

const LOCALE_LABEL_KEYS: Record<AppLocale, "lang.th" | "lang.en" | "lang.zh" | "lang.my"> = {
  th: "lang.th",
  en: "lang.en",
  zh: "lang.zh",
  my: "lang.my",
}

export function LanguageSwitcher() {
  const { locale, setLocale, pending, tx } = useLocale()

  return (
    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Languages className="size-3.5 shrink-0" aria-hidden />
      <span className="sr-only">{tx("lang.label")}</span>
      <select
        value={locale}
        disabled={pending}
        onChange={(e) => setLocale(e.target.value as AppLocale)}
        className="h-8 max-w-[7.5rem] rounded-md border border-border/80 bg-background px-2 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand-red/20"
        aria-label={tx("lang.label")}
      >
        {APP_LOCALES.map((code) => (
          <option key={code} value={code}>
            {tx(LOCALE_LABEL_KEYS[code])}
          </option>
        ))}
      </select>
    </label>
  )
}
