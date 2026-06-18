export const WEEKLY_OFF_DAY_OPTIONS = [
  { value: 1, label: "จ" },
  { value: 2, label: "อ" },
  { value: 3, label: "พ" },
  { value: 4, label: "พฤ" },
  { value: 5, label: "ศ" },
  { value: 6, label: "ส" },
  { value: 7, label: "อา" },
] as const

export type WeeklyOffDay = (typeof WEEKLY_OFF_DAY_OPTIONS)[number]["value"]

export function parseOffDays(value: unknown): WeeklyOffDay[] {
  if (!Array.isArray(value)) return []
  const days = value
    .map((day) => Number.parseInt(String(day), 10))
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
  return [...new Set(days)].sort((a, b) => a - b) as WeeklyOffDay[]
}

export function serializeOffDays(days: WeeklyOffDay[]): WeeklyOffDay[] {
  return [...new Set(days)].sort((a, b) => a - b)
}

/** ISO weekday for YYYY-MM-DD (1=Mon .. 7=Sun). */
export function isoWeekdayFromDate(date: string): WeeklyOffDay {
  const [year, month, day] = date.split("-").map(Number)
  const dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return (dow === 0 ? 7 : dow) as WeeklyOffDay
}

export function isEmployeeOffOnDate(date: string, offDays: readonly number[]): boolean {
  if (offDays.length === 0) return false
  return offDays.includes(isoWeekdayFromDate(date))
}

export function formatOffDaysLabel(offDays: readonly number[]): string {
  if (offDays.length === 0) return "—"
  const labels = new Map(WEEKLY_OFF_DAY_OPTIONS.map((day) => [day.value, day.label]))
  return serializeOffDays(offDays as WeeklyOffDay[])
    .map((day) => labels.get(day) ?? String(day))
    .join(" ")
}
