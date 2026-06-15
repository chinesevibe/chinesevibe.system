import type { AssignableRole } from "@/lib/auth/employee-roles"
import { departmentRoleMismatchMessage } from "@/lib/auth/department-role-defaults"
import { isDev } from "@/lib/auth/roles"
import type { Employee } from "@/lib/auth/session"

export function validateEmployeeDepartmentRole(
  department: string | null | undefined,
  role: AssignableRole,
  caller: Employee | null,
  position?: string | null
): string | null {
  if (caller && isDev(caller.role)) return null
  return departmentRoleMismatchMessage(department, role, position)
}
