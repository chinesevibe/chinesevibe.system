/** Public LIFF app for inbound scan (Login channel) */
export const INBOUND_SCAN_LIFF_ID =
  process.env.NEXT_PUBLIC_LINE_LIFF_INBOUND_SCAN_ID?.trim() || ""

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function parseOrderFromLiffState(state: string | null | undefined): string {
  if (!state) return ""
  try {
    const decoded = decodeURIComponent(state)
    if (decoded.startsWith("?")) {
      return new URLSearchParams(decoded.slice(1)).get("order")?.trim() ?? ""
    }
    if (decoded.startsWith("/")) {
      const segment = decoded.split("/").filter(Boolean)[0]
      if (segment && UUID_RE.test(segment)) return segment
    }
    const params = new URLSearchParams(
      decoded.startsWith("?") ? decoded.slice(1) : decoded
    )
    return params.get("order")?.trim() ?? ""
  } catch {
    return ""
  }
}

function parseOrderFromPathname(pathname: string): string {
  const match = pathname.match(/\/liff\/inbound-scan\/([^/?#]+)/)
  const segment = match?.[1]?.trim()
  if (!segment) return ""
  try {
    const decoded = decodeURIComponent(segment)
    return UUID_RE.test(decoded) ? decoded : ""
  } catch {
    return ""
  }
}

/** Read inbound order id from URL — supports query, liff.state, and path segment */
export function readInboundOrderId(
  search: string,
  pathname = ""
): string {
  const params = new URLSearchParams(search)

  const direct = params.get("order")?.trim()
  if (direct && UUID_RE.test(direct)) return direct

  const fromState = parseOrderFromLiffState(params.get("liff.state"))
  if (fromState) return fromState

  if (pathname) {
    const fromPath = parseOrderFromPathname(pathname)
    if (fromPath) return fromPath
  }

  return ""
}

export function isInboundOrderId(value: string): boolean {
  return UUID_RE.test(value.trim())
}
