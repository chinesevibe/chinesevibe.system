import { coerceLocale, DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/types"

/** Map LINE app / LIFF language (BCP-47 or short code) → app locale. */
export function mapLineLanguageToAppLocale(lineLanguage: string | null | undefined): AppLocale {
  if (!lineLanguage?.trim()) return DEFAULT_LOCALE

  const raw = lineLanguage.trim().toLowerCase().replace(/_/g, "-")
  const base = raw.split("-")[0]

  if (base === "th") return "th"
  if (base === "en") return "en"
  if (base === "my" || raw === "my-mm") return "my"
  if (
    base === "zh" ||
    raw.startsWith("zh-") ||
    raw === "zh-hans" ||
    raw === "zh-hant"
  ) {
    return "zh"
  }

  // Common migrant worker languages in Thailand → keep Thai UI as default
  if (base === "ja" || base === "ko" || base === "id" || base === "vi") {
    return DEFAULT_LOCALE
  }

  return DEFAULT_LOCALE
}

export function mapAcceptLanguageHeader(header: string | null | undefined): AppLocale {
  if (!header?.trim()) return DEFAULT_LOCALE
  const first = header.split(",")[0]?.trim().split(";")[0]?.trim()
  return mapLineLanguageToAppLocale(first)
}

export type LocaleSource = "line" | "manual"

export function isLocaleSource(value: unknown): value is LocaleSource {
  return value === "line" || value === "manual"
}
