import type { AppLocale } from "@/lib/i18n/types"

/** Build absolute LIFF URL with optional lang query for session-less fallback. */
export function liffUrl(path: string, locale: AppLocale): string | undefined {
  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "")
  if (!base) return undefined
  const normalized = path.startsWith("/") ? path : `/${path}`
  return `${base}${normalized}?lang=${locale}`
}
