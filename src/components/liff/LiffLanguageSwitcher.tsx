"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { useLocale, APP_LOCALES } from "@/features/portal/LocaleProvider"
import type { AppLocale } from "@/lib/i18n/types"

const LABELS: Record<AppLocale, string> = {
  th: "ไทย",
  en: "EN",
  zh: "中文",
  my: "MY",
}

export function LiffLanguageSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { locale, setLocale, pending, tx } = useLocale()

  const switchLocale = (next: AppLocale) => {
    setLocale(next)
    const params = new URLSearchParams(searchParams.toString())
    params.set("lang", next)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div
      className="grid w-full grid-cols-4 gap-2"
      role="group"
      aria-label={tx("lang.label")}
    >
      {APP_LOCALES.map((code) => {
        const active = locale === code
        return (
          <button
            key={code}
            type="button"
            onClick={() => switchLocale(code)}
            disabled={pending}
            className={`h-10 rounded-full border px-2 text-[12px] font-semibold transition-colors ${
              active
                ? "border-[#E80012] bg-[#E80012] text-white shadow-sm"
                : "border-gray-200 bg-white text-gray-700 shadow-sm"
            }`}
            aria-pressed={active}
          >
            {LABELS[code]}
          </button>
        )
      })}
    </div>
  )
}
