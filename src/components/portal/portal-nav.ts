import type { AdminNavItem } from "@/components/admin/admin-nav-types"

export const PORTAL_NAV_ITEMS: AdminNavItem[] = [
  { labelKey: "portal.nav.home", href: "/portal", icon: "layout-dashboard" },
  { labelKey: "portal.nav.profile", href: "/portal/profile", icon: "users" },
  { labelKey: "portal.nav.attendance", href: "/portal/attendance", icon: "clock" },
  { labelKey: "portal.nav.schedule", href: "/portal/schedule", icon: "timer" },
  { labelKey: "portal.nav.leave", href: "/portal/leave", icon: "calendar" },
  { labelKey: "portal.nav.documents", href: "/portal/documents", icon: "file-text" },
  {
    labelKey: "portal.nav.announcements",
    href: "/portal/announcements",
    icon: "megaphone",
  },
  { labelKey: "portal.nav.payslips", href: "/portal/payslips", icon: "file-text" },
  { label: "คลังสินค้า", href: "/portal/inventory", icon: "inventory" },
]

/** Thai labels for admin sidebar (no LocaleProvider) */
export const PORTAL_WORKER_NAV_ITEMS: AdminNavItem[] = [
  { label: "หน้าหลัก", href: "/portal", icon: "layout-dashboard" },
  { label: "โปรไฟล์", href: "/portal/profile", icon: "users" },
  { label: "การเข้างาน", href: "/portal/attendance", icon: "clock" },
  { label: "ตารางงาน", href: "/portal/schedule", icon: "timer" },
  { label: "ขอลา", href: "/portal/leave", icon: "calendar" },
  { label: "เอกสาร", href: "/portal/documents", icon: "file-text" },
  { label: "ประกาศ", href: "/portal/announcements", icon: "megaphone" },
  { label: "สลิปเงินเดือน", href: "/portal/payslips", icon: "file-text" },
  { label: "คลังสินค้า", href: "/portal/inventory", icon: "inventory" },
]

export const INVENTORY_ADMIN_NAV_ITEM: AdminNavItem = {
  label: "คลังสินค้า (Admin)",
  href: "/admin/inventory",
  icon: "inventory",
}

export function isPortalNavActive(pathname: string, href: string): boolean {
  if (href === "/admin/inventory") {
    return pathname === "/admin/inventory" || pathname.startsWith("/admin/inventory/")
  }
  return href === "/portal" ? pathname === "/portal" : pathname.startsWith(href)
}
