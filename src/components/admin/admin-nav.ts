import type { AdminNavGroup, AdminNavItem } from "@/components/admin/admin-nav-types"

export type { AdminNavItem, AdminNavIconName, AdminNavGroup } from "@/components/admin/admin-nav-types"

/** Grouped sidebar navigation — 3 sections per sitemap */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    title: "บริหารบุคคล",
    items: [
      { label: "แดชบอร์ด", href: "/admin", icon: "layout-dashboard" },
      { label: "พนักงาน", href: "/admin/employees", icon: "users" },
      { label: "การเข้างาน", href: "/admin/attendance", icon: "clock" },
      { label: "จัดการลา", href: "/admin/leaves", icon: "calendar" },
      { label: "OT", href: "/admin/overtime", icon: "timer" },
      { label: "ประกาศ", href: "/admin/announcements", icon: "megaphone" },
      { label: "ข้อร้องเรียน", href: "/admin/complaints", icon: "message-warning" },
      { label: "เอกสาร", href: "/admin/documents", icon: "file-text" },
      { label: "การแจ้งเตือน", href: "/admin/alerts", icon: "bell" },
    ],
  },
  {
    title: "บัญชี",
    items: [{ label: "Payroll", href: "/admin/payroll", icon: "wallet" }],
  },
  {
    title: "การจัดการ",
    items: [
      { label: "โครงสร้างองค์กร", href: "/admin/organization", icon: "organization" },
      { label: "สาขา", href: "/admin/branches", icon: "branches" },
      { label: "รายงานและวิเคราะห์", href: "/admin/report", icon: "bar-chart" },
      { label: "คลังสินค้า", href: "/admin/inventory", icon: "inventory" },
      { label: "ตั้งค่า", href: "/admin/settings", icon: "settings" },
    ],
  },
]

/** Flatten groups for backward-compatible consumers */
export function flattenAdminNavGroups(groups: AdminNavGroup[]): AdminNavItem[] {
  return groups.flatMap((group) => group.items)
}

/** @deprecated Use ADMIN_NAV_GROUPS — flat list kept for legacy imports */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = flattenAdminNavGroups(ADMIN_NAV_GROUPS)

export function isAdminNavActive(pathname: string, href: string): boolean {
  if (href === "/admin/report") {
    return pathname === "/admin/report" || pathname.startsWith("/admin/report/")
  }
  if (href === "/admin/alerts") {
    return pathname === "/admin/alerts" || pathname.startsWith("/admin/alerts/")
  }
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href)
}
