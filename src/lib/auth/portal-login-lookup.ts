import { getAdminClient } from "@/lib/auth/admin-client"
import { requiresOfficerPortalPassword } from "@/lib/auth/department-access"

export type PortalLoginEmployee = {
  id: string
  line_user_id: string | null
  role: string
  status: string
  department: string | null
  position: string | null
  portal_password_hash: string | null
}

export async function lookupPortalLoginEmployee(
  employeeCode: string,
  branchId: string
): Promise<PortalLoginEmployee | null> {
  const admin = getAdminClient()

  const { data: employee, error } = await admin
    .from("hr_employees")
    .select(
      "id, line_user_id, role, status, department, position, portal_password_hash"
    )
    .eq("branch_id", branchId)
    .ilike("employee_code", employeeCode)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!employee) return null

  return {
    id: employee.id as string,
    line_user_id:
      typeof employee.line_user_id === "string" ? employee.line_user_id : null,
    role: employee.role as string,
    status: employee.status as string,
    department:
      typeof employee.department === "string" ? employee.department : null,
    position:
      typeof employee.position === "string" ? employee.position : null,
    portal_password_hash:
      typeof employee.portal_password_hash === "string"
        ? employee.portal_password_hash
        : null,
  }
}

export function getPortalPasswordRequirements(employee: PortalLoginEmployee): {
  requiresPassword: boolean
  needsSetup: boolean
} {
  const requiresPassword = requiresOfficerPortalPassword(employee.department)
  return {
    requiresPassword,
    needsSetup: requiresPassword && !employee.portal_password_hash,
  }
}
