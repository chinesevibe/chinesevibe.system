import { redirect } from "next/navigation"

import {
  canAccessInventoryPortal,
  canManageHr,
  isCeo,
  isDev,
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

/** Master data (SKU, Supplier, branches, warehouses) — HR/CEO/Dev only */
export async function requireInventoryMasterData(): Promise<Employee> {
  const employee = await getCurrentEmployee()

  if (!employee) {
    redirect("/login")
  }
  if (
    employee.role !== "dev" &&
    !canManageHr(employee.role) &&
    !isCeo(employee.role)
  ) {
    redirect("/login?error=forbidden")
  }

  return employee
}

export function canManageInventoryMasterData(employee: Employee): boolean {
  return isDev(employee.role) || canManageHr(employee.role) || isCeo(employee.role)
}
