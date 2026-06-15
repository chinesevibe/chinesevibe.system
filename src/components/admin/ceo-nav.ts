import {
  ADMIN_NAV_GROUPS,
  flattenAdminNavGroups,
  isAdminNavActive,
  type AdminNavItem,
} from "@/components/admin/admin-nav"

/** @deprecated CEO uses ADMIN_NAV_GROUPS — kept for legacy imports */
export const CEO_NAV_ITEMS: AdminNavItem[] = flattenAdminNavGroups(ADMIN_NAV_GROUPS)

/** @deprecated Use isAdminNavActive */
export function isCeoNavActive(pathname: string, href: string): boolean {
  return isAdminNavActive(pathname, href)
}
