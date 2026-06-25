"use client"

import { useLocale, APP_LOCALES } from "@/features/portal/LocaleProvider"
import type { AppLocale } from "@/lib/i18n/types"

const LOCALE_LABEL: Record<AppLocale, string> = {
  th: "ไทย",
  en: "EN",
  zh: "中文",
  my: "MY",
}

export function MobileLanguageSwitcher() {
  const { locale, setLocale, pending } = useLocale()

  return (
    <div className="flex items-center gap-1">
      {APP_LOCALES.map((code) => {
        const active = locale === code
        return (
          <button
            key={code}
            type="button"
            disabled={pending}
            onClick={() => setLocale(code)}
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${
              active
                ? "bg-white text-[#E11D2A]"
                : "bg-white/20 text-white/80 active:bg-white/30"
            }`}
          >
            {LOCALE_LABEL[code]}
          </button>
        )
      })}
    </div>
  )
}
