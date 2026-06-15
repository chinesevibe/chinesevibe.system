import {
  type AdminNavGroup,
  type AdminNavItem,
} from "@/components/admin/admin-nav"
import { PORTAL_WORKER_NAV_ITEMS, isPortalNavActive } from "@/components/portal/portal-nav"

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

/** Inventory Manager — คลังสินค้า + เมนูพортัลพนักงาน */
export function getInventoryManagerNavGroups(): AdminNavGroup[] {
  return [
    { title: "คลังสินค้า", items: INVENTORY_NAV_ITEMS },
    { title: "พอร์ทัลพนักงาน", items: PORTAL_WORKER_NAV_ITEMS },
  ]
}

export function isInventoryNavActive(pathname: string, href: string): boolean {
  if (href === "/admin/inventory") {
    return isInventoryPortalPath(pathname)
  }
  return pathname.startsWith(href)
}

export function isInventoryManagerNavActive(pathname: string, href: string): boolean {
  if (href.startsWith("/portal") || href === "/admin/inventory") {
    return isPortalNavActive(pathname, href)
  }
  return isInventoryNavActive(pathname, href)
}
