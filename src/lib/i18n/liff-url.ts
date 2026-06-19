import type { AppLocale } from "@/lib/i18n/types"

function withLangQuery(path: string, locale: AppLocale): string {
  const normalized = path.startsWith("/") ? path : `/${path}`
  const [beforeHash, hash = ""] = normalized.split("#", 2)
  const [pathname, search = ""] = beforeHash.split("?", 2)
  const params = new URLSearchParams(search)
  params.set("lang", locale)
  const query = params.toString()
  return `${pathname}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`
}

/** Build relative LIFF href that preserves the active lang query. */
export function liffHref(path: string, locale: AppLocale): string {
  return withLangQuery(path, locale)
}

/** Build absolute LIFF URL with lang query for session-less fallback. */
export function liffUrl(path: string, locale: AppLocale): string | undefined {
  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "")
  if (!base) return undefined
  return `${base}${withLangQuery(path, locale)}`
}
