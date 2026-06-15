import { formatIctTime, ictDayRangeUtc } from "@/lib/attendance/late"
import { ictLocalToUtc } from "@/lib/attendance/ict-datetime"

export const TH_TIMEZONE = "Asia/Bangkok"
export const TH_LOCALE = "th-TH"

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000

export { formatIctTime, ictDayRangeUtc, ictLocalToUtc }

/** ICT calendar date YYYY-MM-DD (business "today"). */
export function ictToday(): string {
  return new Date(Date.now() + ICT_OFFSET_MS).toISOString().slice(0, 10)
}

export function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  const date = typeof value === "string" ? new Date(value) : value
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatThaiDate(
  value: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  }
): string {
  const date = toDate(value)
  if (!date) return "—"
  return date.toLocaleDateString(TH_LOCALE, { timeZone: TH_TIMEZONE, ...options })
}

export function formatThaiDateTime(
  value: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }
): string {
  const date = toDate(value)
  if (!date) return "—"
  return date.toLocaleString(TH_LOCALE, { timeZone: TH_TIMEZONE, ...options })
}

/** Format YYYY-MM-DD stored dates (no time) as Thai calendar date. */
/** DD/MM/YYYY (พ.ศ.) for date-only fields e.g. contract_start. */
export function formatThaiSlashDate(value: string | null | undefined): string {
  if (!value?.trim()) return "—"
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return formatThaiDate(ictLocalToUtc(value, "12:00"), {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }
  return formatThaiDate(value, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function formatThaiDateOnly(value: string | null | undefined): string {
  if (!value?.trim()) return "—"
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  return formatThaiDate(ictLocalToUtc(value, "12:00"), {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function formatThaiLongDate(now = new Date()): string {
  return now.toLocaleDateString(TH_LOCALE, {
    timeZone: TH_TIMEZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function formatThaiMonthYear(now = new Date()): string {
  return now.toLocaleDateString(TH_LOCALE, {
    timeZone: TH_TIMEZONE,
    month: "long",
    year: "numeric",
  })
}

/** Value for `<input type="datetime-local" />` in ICT. */
export function toDatetimeLocalIct(value: Date | string): string {
  const date = toDate(value)
  if (!date) return ""
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TH_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ""
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`
}

/** Parse `<input type="datetime-local" />` wall time as ICT → UTC instant. */
export function parseDatetimeLocalIct(value: string): Date {
  const [datePart, timePart = "00:00"] = value.split("T")
  if (!datePart) throw new Error("invalid datetime")
  const [y, m, d] = datePart.split("-").map(Number)
  const [hh, mm] = timePart.split(":").map(Number)
  const pad = (n: number) => String(n).padStart(2, "0")
  return ictLocalToUtc(`${y}-${pad(m)}-${pad(d)}`, `${pad(hh)}:${pad(mm)}`)
}
