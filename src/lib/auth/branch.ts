import { createClient } from "@/lib/supabase/server"

import type { Employee } from "./session"

export type EmployeeWithBranch = Employee & {
  branch_id: string | null
  department_id: string | null
}

export async function getCurrentEmployeeWithBranch(): Promise<EmployeeWithBranch | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const lineUserId = user.app_metadata?.line_user_id
  if (typeof lineUserId !== "string" || !lineUserId) return null

  const { data } = await supabase
    .from("hr_employees")
    .select("id, line_user_id, name, position, department, role, status, branch_id, department_id")
    .eq("line_user_id", lineUserId)
    .maybeSingle()

  return (data as EmployeeWithBranch | null) ?? null
}

export async function getManagedBranchId(managerId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("hr_branches")
    .select("id")
    .eq("manager_employee_id", managerId)
    .maybeSingle()

  return (data?.id as string) ?? null
}

export { isBranchManager, canManageHr as isHrOrAdmin, canApproveHrRequests } from "@/lib/auth/roles"
