const DAY_MS = 86_400_000

export type ExpiryStatus = "ok" | "expiring" | "expired" | "none"

export type ExpiryStatusLabel = {
  status: ExpiryStatus
  label: string
  variant: "approved" | "pending" | "warning" | "rejected" | "neutral"
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS
  )
}

export function deriveExpiryStatus(
  expiry: string | null,
  today: string,
  windowDays = 30
): ExpiryStatus {
  if (!expiry) return "none"
  if (expiry < today) return "expired"
  if (daysBetween(today, expiry) <= windowDays) return "expiring"
  return "ok"
}

export function expiryStatusLabel(
  expiry: string | null,
  today: string,
  windowDays = 30
): ExpiryStatusLabel {
  const status = deriveExpiryStatus(expiry, today, windowDays)
  switch (status) {
    case "expired":
      return { status, label: "หมดอายุ", variant: "rejected" }
    case "expiring":
      return { status, label: "ใกล้หมดอายุ", variant: "warning" }
    case "ok":
      return { status, label: "ปกติ", variant: "approved" }
    default:
      return { status, label: "ไม่ระบุ", variant: "neutral" }
  }
}
