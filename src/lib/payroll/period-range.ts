import type { PeriodRange } from "@/lib/payroll/types"

export interface ResolvePeriodRangeInput {
  period: string
  cutoffDay?: number
  periodStart?: string
  periodEnd?: string
}

function parsePeriod(period: string): { year: number; month: number } {
  if (!/^\d{4}-\d{2}$/.test(period)) {
    throw new Error(`Invalid period format: ${period}`)
  }
  const [yearStr, monthStr] = period.split("-")
  const year = Number.parseInt(yearStr, 10)
  const month = Number.parseInt(monthStr, 10)
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month in period: ${period}`)
  }
  return { year, month }
}

export function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function clampCutoffDay(year: number, month: number, cutoffDay: number): number {
  const clamped = Math.min(Math.max(1, cutoffDay), 31)
  return Math.min(clamped, lastDayOfMonth(year, month))
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return formatDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
}

function formatThaiLabel(start: string, end: string): string {
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number)
    return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`
  }
  return `${fmt(start)} – ${fmt(end)}`
}

function previousMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 }
  return { year, month: month - 1 }
}

function computeRangeFromCutoff(period: string, cutoffDay: number): PeriodRange {
  const { year, month } = parsePeriod(period)
  const prev = previousMonth(year, month)

  const periodEndDay = clampCutoffDay(year, month, cutoffDay)
  const periodEnd = formatDate(year, month, periodEndDay)

  const prevEndDay = clampCutoffDay(prev.year, prev.month, cutoffDay)
  const prevPeriodEnd = formatDate(prev.year, prev.month, prevEndDay)
  const periodStart = addDays(prevPeriodEnd, 1)

  const periodEndExclusive = addDays(periodEnd, 1)

  return {
    periodStart,
    periodEnd,
    periodEndExclusive,
    label: formatThaiLabel(periodStart, periodEnd),
  }
}

export function resolvePeriodRange(input: ResolvePeriodRangeInput): PeriodRange {
  if (input.periodStart && input.periodEnd) {
    if (input.periodStart > input.periodEnd) {
      throw new Error("periodStart must be on or before periodEnd")
    }
    return {
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      periodEndExclusive: addDays(input.periodEnd, 1),
      label: formatThaiLabel(input.periodStart, input.periodEnd),
    }
  }

  const cutoff = input.cutoffDay ?? 31
  return computeRangeFromCutoff(input.period, cutoff)
}
