"use client"

import { useMemo } from "react"
import { usePathname, useSearchParams } from "next/navigation"

import { useLocale } from "@/features/portal/LocaleProvider"
import type { MessageKey } from "@/lib/i18n/translate"
import { t } from "@/lib/i18n/translate"
import type { AppLocale } from "@/lib/i18n/types"

export function LiffLoginPrompt({
  titleKey,
  locale,
}: {
  titleKey: MessageKey
  locale?: AppLocale
}) {
  const { locale: currentLocale } = useLocale()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const effectiveLocale = locale ?? currentLocale
  const search = searchParams.toString()
  const loginHref = useMemo(() => {
    const params = new URLSearchParams({ lang: effectiveLocale })
    const next = `${pathname}${search ? `?${search}` : ""}`
    params.set("next", next)
    return `/login?${params.toString()}`
  }, [effectiveLocale, pathname, search])
  const tx = (key: MessageKey) => t(key, effectiveLocale)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#F5F5F5] p-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-2 text-3xl">🔐</div>
        <h2 className="text-base font-medium text-gray-900">{tx(titleKey)}</h2>
        <p className="mt-1 text-sm text-gray-400">{tx("liff.common.loginTitle")}</p>
        <p className="mt-4 text-sm text-gray-500">
          {tx("liff.common.notLoggedIn")}{" "}
          <a href={loginHref} className="font-medium text-[#E80012] underline">
            {tx("liff.common.login")}
          </a>
        </p>
      </div>
    </main>
  )
}
