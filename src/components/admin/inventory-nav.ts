import {
  type AdminNavGroup,
  type AdminNavItem,
} from "@/components/admin/admin-nav"

/** Inventory portal — /admin/inventory และ sub-routes */
export function isInventoryPortalPath(pathname: string): boolean {
  return pathname === "/admin/inventory" || pathname.startsWith("/admin/inventory/")
}

export const INVENTORY_NAV_ITEMS: AdminNavItem[] = [
  {
    label: "คลังสินค้า",
    href: "/admin/inventory",
    icon: "inventory",
  },
]

const INVENTORY_NAV_GROUPS: AdminNavGroup[] = [
  { title: "", items: INVENTORY_NAV_ITEMS },
]

export function getInventoryNavGroups(): AdminNavGroup[] {
  return INVENTORY_NAV_GROUPS
}

export function isInventoryNavActive(pathname: string, href: string): boolean {
  if (href === "/admin/inventory") {
    return isInventoryPortalPath(pathname)
  }
  return pathname.startsWith(href)
}
