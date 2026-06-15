/** Max items shown in the admin bell dropdown */
export const NOTIFICATION_LIST_LIMIT = 10

export type NotificationKind =
  | "registration"
  | "onboarding"
  | "leave"
  | "attendance"
  | "overtime"
  | "document"
  | "complaint"
  | "probation"
  | "visa"
  | "work_permit"
  | "inbound"
  | "requisition"
  | "damage"
  | "low_stock"

export type NotificationItem = {
  id: string
  kind: NotificationKind
  title: string
  summary: string
  href: string
  createdAt: string | null
  urgency: "normal" | "urgent"
}

export type NotificationInbox = {
  items: NotificationItem[]
  /** All notifications (approvals + compliance reminders) */
  total: number
  /** Pending approval queue only — shown on bell badge */
  approvalTotal: number
  complianceTotal: number
  /** Sidebar red-dot counts keyed by nav href */
  navBadges: Record<string, number>
}
