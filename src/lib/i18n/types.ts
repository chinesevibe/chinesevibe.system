export const APP_LOCALES = ["th", "en", "zh", "my"] as const

export type AppLocale = (typeof APP_LOCALES)[number]

export const DEFAULT_LOCALE: AppLocale = "th"

export const LOCALE_COOKIE = "hr_locale"

export function isAppLocale(value: unknown): value is AppLocale {
  return (
    typeof value === "string" &&
    (APP_LOCALES as readonly string[]).includes(value)
  )
}

export function coerceLocale(value: unknown): AppLocale {
  return isAppLocale(value) ? value : DEFAULT_LOCALE
}
