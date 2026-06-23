import type { Employee } from "@/lib/auth/session"
import {
  adminLoginPath,
  canAccessInventoryPortal,
  canAccessPortalInventoryWorkspace,
} from "@/lib/auth/roles"

export type InventoryEntryTarget = "stock" | "inbound"

const INVENTORY_ENTRY_PATHS: Record<
  InventoryEntryTarget,
  { admin: string; portal: string }
> = {
  stock: {
    admin: "/admin/inventory/stock",
    portal: "/portal/stock",
  },
  inbound: {
    admin: "/admin/inventory/inbound",
    portal: "/portal/inbound",
  },
}

export function resolveInventoryEntryPath(
  employee: Employee,
  target: InventoryEntryTarget
): string {
  const paths = INVENTORY_ENTRY_PATHS[target]

  if (canAccessPortalInventoryWorkspace(employee)) {
    return paths.portal
  }

  if (canAccessInventoryPortal(employee)) {
    return paths.admin
  }

  return adminLoginPath(
    employee.role,
    employee.status,
    employee.department,
    employee.position
  )
}
