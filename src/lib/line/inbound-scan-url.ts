import { INBOUND_SCAN_LIFF_ID } from "@/lib/line/inbound-order-id"
import type { AppLocale } from "@/lib/i18n/types"

export function inboundScanPath(orderId: string, locale?: AppLocale): string {
  const id = encodeURIComponent(orderId)
  const params = new URLSearchParams()
  if (locale) params.set("lang", locale)
  const query = params.toString()
  return `/liff/inbound-scan/${id}${query ? `?${query}` : ""}`
}

/** Build inbound scan URL — LIFF path form survives liff.state redirect */
export function inboundScanHref(orderId: string, locale?: AppLocale): string {
  const id = encodeURIComponent(orderId)
  const path = inboundScanPath(orderId, locale)
  const langQuery = locale ? `?lang=${locale}` : ""

  if (INBOUND_SCAN_LIFF_ID) {
    return `https://liff.line.me/${INBOUND_SCAN_LIFF_ID}/${id}${langQuery}`
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "")
  if (base) {
    return `${base}${path}`
  }

  return path
}
