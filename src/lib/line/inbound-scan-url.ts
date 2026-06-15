import { INBOUND_SCAN_LIFF_ID } from "@/lib/line/inbound-order-id"
import type { AppLocale } from "@/lib/i18n/types"

/** Build inbound scan URL — LIFF path form survives liff.state redirect */
export function inboundScanHref(orderId: string, locale?: AppLocale): string {
  const id = encodeURIComponent(orderId)
  const langQuery = locale ? `?lang=${locale}` : ""

  if (INBOUND_SCAN_LIFF_ID) {
    return `https://liff.line.me/${INBOUND_SCAN_LIFF_ID}/${id}${langQuery}`
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "")
  if (base) {
    return `${base}/liff/inbound-scan/${id}${langQuery}`
  }

  return `/liff/inbound-scan/${id}${langQuery}`
}
