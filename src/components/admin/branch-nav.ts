import {
  ADMIN_NAV_GROUPS,
  flattenAdminNavGroups,
  type AdminNavGroup,
  type AdminNavItem,
} from "@/components/admin/admin-nav"
import { getInventoryNavGroups } from "@/components/admin/inventory-nav"
import { isInventoryPortalUser } from "@/lib/auth/roles"
import type { Employee } from "@/lib/auth/session"

/** BM portal — /admin/branch เท่านั้น + legacy sub-routes (ไม่รวม /admin/branch/<slug> ของ HR) */
export function isBranchPortalPath(pathname: string): boolean {
  if (pathname === "/admin/branch") return true
  return HIDDEN_BRANCH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
}

/** ซ่อนจาก nav — redirect ไป /admin/branch */
export const HIDDEN_BRANCH_PATHS = [
  "/admin/branch/team",
  "/admin/branch/leaves",
  "/admin/branch/overtime",
  "/admin/branch/attendance",
] as const

/** BM sub-routes ซ่อนทั้งหมด — ใช้ Branch Dashboard เท่านั้น */
export const BRANCH_SECTION_ITEMS: AdminNavItem[] = []

/** Sidebar สำหรับ Branch Manager — hub only; tools อยู่ใน /admin/branch */
export const BRANCH_NAV_ITEMS: AdminNavItem[] = [
  {
    label: "แดชบอร์ดสาขา",
    href: "/admin/branch",
    icon: "layout-dashboard",
  },
]

const BRANCH_NAV_GROUPS: AdminNavGroup[] = [
  { title: "", items: BRANCH_NAV_ITEMS },
]

export function getNavGroupsForEmployee(employee: Employee): AdminNavGroup[] {
  if (isInventoryPortalUser(employee)) return getInventoryNavGroups()
  if (employee.role === "branch_manager") return BRANCH_NAV_GROUPS
  return ADMIN_NAV_GROUPS
}

export function getNavGroupsForRole(
  role: "employee" | "hr" | "admin" | "branch_manager" | "ceo" | "dev"
): AdminNavGroup[] {
  if (role === "branch_manager") return BRANCH_NAV_GROUPS
  return ADMIN_NAV_GROUPS
}

/** @deprecated Use getNavGroupsForRole — flat list for legacy consumers */
export function getNavItemsForRole(
  role: "employee" | "hr" | "admin" | "branch_manager" | "ceo" | "dev",
  _department: string | null = null
): AdminNavItem[] {
  return flattenAdminNavGroups(getNavGroupsForRole(role))
}

export function withBranchPendingBadges(
  groups: AdminNavGroup[],
  counts: { total: number }
): AdminNavGroup[] {
  return groups.map((group) => ({
    ...group,
    items: group.items.map((item) => {
      if (item.href === "/admin/branch") {
        return counts.total > 0 ? { ...item, badge: counts.total } : item
      }
      return item
    }),
  }))
}

export function isBranchNavActive(pathname: string, href: string): boolean {
  if (href === "/admin/branch") {
    return isBranchPortalPath(pathname)
  }
  return pathname.startsWith(href)
}
