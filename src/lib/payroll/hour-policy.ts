import type { PayType } from "@/lib/payroll/pay-type"

export function roundPayrollHours(hours: number): number {
  if (!Number.isFinite(hours) || hours <= 0) return 0
  return Math.round(hours)
}

export function shouldTrackRegularWorkHours(payType: PayType | string | null | undefined): boolean {
  return payType !== "monthly"
}

export function resolveRegularWorkHours(
  payType: PayType | string | null | undefined,
  hours: number
): number | null {
  if (!shouldTrackRegularWorkHours(payType)) return null
  return roundPayrollHours(hours)
}
