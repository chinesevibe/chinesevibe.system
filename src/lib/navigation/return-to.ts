export function sanitizeReturnTo(value: string | null | undefined): string | null {
  if (!value) return null
  if (!value.startsWith("/") || value.startsWith("//")) return null
  return value
}

export function appendReturnTo(href: string, returnTo?: string | null): string {
  const safeReturnTo = sanitizeReturnTo(returnTo ?? null)
  if (!safeReturnTo) return href

  const url = new URL(href, "http://localhost")
  url.searchParams.set("returnTo", safeReturnTo)

  const query = url.searchParams.toString()
  return query ? `${url.pathname}?${query}` : url.pathname
}
