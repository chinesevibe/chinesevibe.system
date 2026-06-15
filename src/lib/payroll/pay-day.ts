export type PayDay = 4 | 5
export type Nationality = "thai" | "myanmar" | "chinese"

export const NATIONALITY_OPTIONS: Array<{
  value: Nationality
  label: string
  payDay: PayDay
}> = [
  { value: "thai", label: "ไทย", payDay: 4 },
  { value: "myanmar", label: "พม่า", payDay: 4 },
  { value: "chinese", label: "จีน", payDay: 5 },
]

export const PAY_DAY_OPTIONS: Array<{ value: PayDay; label: string }> = [
  { value: 4, label: "วันที่ 4 (ไทย / พม่า)" },
  { value: 5, label: "วันที่ 5 (จีน)" },
]

export function isValidNationality(value: string | null | undefined): value is Nationality {
  return value === "thai" || value === "myanmar" || value === "chinese"
}

export function isValidPayDay(value: number | null | undefined): value is PayDay {
  return value === 4 || value === 5
}

/** Default pay day from nationality — Chinese = 5, others = 4 */
export function defaultPayDayForNationality(nationality: string | null | undefined): PayDay {
  if (nationality === "chinese") return 5
  return 4
}

/** Effective pay day: explicit override wins, else nationality default, else 4 */
export function resolvePayDay(
  nationality: string | null | undefined,
  explicitPayDay: number | null | undefined
): PayDay {
  if (isValidPayDay(explicitPayDay)) return explicitPayDay
  return defaultPayDayForNationality(nationality)
}

export function payDayLabel(payDay: PayDay): string {
  return payDay === 5 ? "วันที่ 5 (จีน)" : "วันที่ 4 (ไทย / พม่า)"
}

export function odooPayTag(payDay: PayDay): string {
  return payDay === 5 ? "Pay-05" : "Pay-04"
}

/**
 * Payment date for a payroll period (YYYY-MM).
 * Salary for month M is paid on day D of month M+1.
 */
export function computePaymentDate(period: string, payDay: PayDay): string {
  const [yearStr, monthStr] = period.split("-")
  const year = Number.parseInt(yearStr, 10)
  const month = Number.parseInt(monthStr, 10)
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(payDay).padStart(2, "0")}`
}

export function nationalityLabel(nationality: string | null | undefined): string {
  const found = NATIONALITY_OPTIONS.find((o) => o.value === nationality)
  return found?.label ?? "—"
}
