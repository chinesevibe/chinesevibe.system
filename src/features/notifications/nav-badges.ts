import type { AdminNavGroup, AdminNavItem } from "@/components/admin/admin-nav-types"

export type HrApprovalCounts = {
  registration: number
  onboarding: number
  /** All leaves with status=pending — matches Leave Management page */
  leavePending: number
  /** Leaves awaiting HR final approval — matches HR Approval Queue */
  leaveHr: number
  attendance: number
  overtime: number
  document: number
  complaint: number
}

export type NavAlertBadgeMap = Record<string, number>

export function hrApprovalCountsTotal(counts: HrApprovalCounts): number {
  return (
    counts.registration +
    counts.onboarding +
    counts.leavePending +
    counts.attendance +
    counts.overtime +
    counts.document +
    counts.complaint
  )
}

/** Map notification counts → sidebar href badges (HR admin nav). */
export function buildHrNavBadges(
  counts: HrApprovalCounts,
  complianceTotal: number
): NavAlertBadgeMap {
  const badges: NavAlertBadgeMap = {}
  const approvalTotal = hrApprovalCountsTotal(counts)

  if (approvalTotal > 0) {
    badges["/admin"] = approvalTotal
  }

  const employees = counts.registration + counts.onboarding + complianceTotal
  if (employees > 0) {
    badges["/admin/employees"] = employees
  }

  if (counts.attendance > 0) badges["/admin/attendance"] = counts.attendance
  if (counts.leavePending > 0) badges["/admin/leaves"] = counts.leavePending
  if (counts.overtime > 0) badges["/admin/overtime"] = counts.overtime
  if (counts.document > 0) badges["/admin/documents"] = counts.document
  if (counts.complaint > 0) badges["/admin/complaints"] = counts.complaint

  return badges
}

export type BranchNavAlertCounts = {
  attendance: number
  leaves: number
  overtime: number
  total: number
}

export function buildBranchNavBadges(counts: BranchNavAlertCounts): NavAlertBadgeMap {
  const badges: NavAlertBadgeMap = {}
  if (counts.total > 0) badges["/admin/branch"] = counts.total
  return badges
}

export type InventoryNavAlertCounts = {
  inbound: number
  requisition: number
  damage: number
  lowStock: number
  total: number
}

export function buildInventoryNavBadges(
  counts: InventoryNavAlertCounts
): NavAlertBadgeMap {
  const badges: NavAlertBadgeMap = {}
  if (counts.total > 0) badges["/admin/inventory"] = counts.total
  if (counts.inbound > 0) badges["/admin/inventory/inbound"] = counts.inbound
  if (counts.requisition > 0) {
    badges["/admin/inventory/requisition"] = counts.requisition
  }
  if (counts.damage > 0) badges["/admin/inventory/damage"] = counts.damage
  if (counts.lowStock > 0) badges["/admin/inventory/stock"] = counts.lowStock
  return badges
}

function applyBadgesToItems(
  items: AdminNavItem[],
  badges: NavAlertBadgeMap
): AdminNavItem[] {
  return items.map((item) => {
    const count = badges[item.href]
    if (count && count > 0) {
      return { ...item, badge: count }
    }
    return item.badge ? { ...item, badge: undefined } : item
  })
}

export function withNavAlertBadges(
  items: AdminNavItem[],
  badges: NavAlertBadgeMap
): AdminNavItem[] {
  return applyBadgesToItems(items, badges)
}

export function withNavGroupAlertBadges(
  groups: AdminNavGroup[],
  badges: NavAlertBadgeMap
): AdminNavGroup[] {
  return groups.map((group) => ({
    ...group,
    items: applyBadgesToItems(group.items, badges),
  }))
}
