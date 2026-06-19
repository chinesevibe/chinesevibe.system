import { redirect } from "next/navigation"

import {
  canAccessInventoryPortal,
  canManageInventory,
  hasHrInventoryAccess,
  isCeo,
  isDev,
  isInventoryRole,
} from "@/lib/auth/roles"
import { getCurrentEmployee, type Employee } from "@/lib/auth/session"

/** Operational + read access to inventory admin routes */
export async function requireInventoryPortal(): Promise<Employee> {
  const employee = await getCurrentEmployee()

  if (!employee) {
    redirect("/login")
  }
  if (employee.role !== "dev" && !canAccessInventoryPortal(employee)) {
    redirect("/login?error=forbidden")
  }

  return employee
}

/** Master data (SKU, Supplier, branches, warehouses) — HR/CEO/Inventory/Dev */
export async function requireInventoryMasterData(): Promise<Employee> {
  const employee = await getCurrentEmployee()

  if (!employee) {
    redirect("/login")
  }
  if (
    employee.role !== "dev" &&
    !hasHrInventoryAccess(employee) &&
    !isCeo(employee.role) &&
    !isInventoryRole(employee.role) &&
    !canAccessInventoryPortal(employee)
  ) {
    redirect("/login?error=forbidden")
  }

  return employee
}

export function canManageInventoryMasterData(employee: Employee): boolean {
  return (
    isDev(employee.role) ||
    canManageInventory(employee) ||
    isCeo(employee.role)
  )
}
