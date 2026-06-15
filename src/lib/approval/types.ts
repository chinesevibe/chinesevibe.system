export const APPROVAL_STATUSES = [
  "pending_manager",
  "pending_hr",
  "approved",
  "rejected",
  "expired",
] as const

export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number]

export const SLA_HOURS = 48

export function expiresAtFrom(submittedAt: Date): Date {
  return new Date(submittedAt.getTime() + SLA_HOURS * 60 * 60 * 1000)
}

export function isExpired(submittedAt: Date, now = new Date()): boolean {
  return now.getTime() > expiresAtFrom(submittedAt).getTime()
}
