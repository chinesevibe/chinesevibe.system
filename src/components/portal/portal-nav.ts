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
  { labelKey: "portal.nav.inbound", href: "/portal/inbound", icon: "inventory" },
  { labelKey: "portal.nav.stock", href: "/portal/stock", icon: "list-checks" },
]

export function isPortalNavActive(pathname: string, href: string): boolean {
  return href === "/portal" ? pathname === "/portal" : pathname.startsWith(href)
}
