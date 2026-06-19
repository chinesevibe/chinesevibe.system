export const PENDING_QUEUE_CATEGORIES = [
  "registration",
  "leave",
  "overtime",
  "document",
  "complaint",
  "attendance",
] as const

export type PendingQueueCategory = (typeof PENDING_QUEUE_CATEGORIES)[number]

export type PendingQueueItem = {
  id: string
  category: PendingQueueCategory
  title: string
  subtitle: string | null
  meta: string | null
  decidePath: string
  /** leave / OT need HR Officer */
  requiresHrOfficer: boolean
  /** complaint uses reply flow instead of approve/reject */
  kind: "standard" | "complaint"
}

export type PendingQueuePayload = {
  counts: import("@/features/notifications/nav-badges").HrApprovalCounts
  total: number
  items: PendingQueueItem[]
}
