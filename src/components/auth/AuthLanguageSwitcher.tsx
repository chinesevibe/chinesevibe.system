"use client"

import { useLocale, APP_LOCALES } from "@/features/portal/LocaleProvider"
import type { AppLocale } from "@/lib/i18n/types"
import { cn } from "@/lib/utils"

const LOCALE_SHORT: Record<AppLocale, string> = {
  th: "ไทย",
  en: "EN",
  zh: "中文",
  my: "MY",
}

export function AuthLanguageSwitcher() {
  const { locale, setLocale, tx } = useLocale()

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-1.5"
      role="group"
      aria-label={tx("lang.label")}
    >
      {APP_LOCALES.map((code) => {
        const active = locale === code
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              "border outline-none focus-visible:ring-2 focus-visible:ring-brand-red/30",
              active
                ? "border-brand-red bg-brand-red text-white"
                : "border-border/80 bg-background text-muted-foreground hover:border-brand-red/40 hover:text-foreground"
            )}
            aria-pressed={active}
          >
            {LOCALE_SHORT[code]}
          </button>
        )
      })}
    </div>
  )
}
