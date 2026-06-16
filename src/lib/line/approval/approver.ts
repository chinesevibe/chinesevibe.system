import { getAdminClient } from "@/lib/auth/admin-client"
import { canApproveHrRequests, canManageHr, isDev } from "@/lib/auth/roles"
import type { Employee } from "@/lib/auth/session"

export type LineApprover = { id: string; name: string; role: Employee["role"] }

export async function assertHrLineApprover(
  lineUserId: string | undefined
): Promise<LineApprover | null> {
  if (!lineUserId) return null

  const admin = getAdminClient()
  const { data } = await admin
    .from("hr_employees")
    .select("id, name, role, status")
    .eq("line_user_id", lineUserId)
    .maybeSingle()

  if (!data || data.status !== "active") return null
  if (!canManageHr(data.role as Employee["role"])) return null

  return {
    id: data.id as string,
    name: data.name as string,
    role: data.role as Employee["role"],
  }
}

/** Leave / OT — HR Officer (role hr) only */
export async function assertHrOfficerLineApprover(
  lineUserId: string | undefined
): Promise<LineApprover | null> {
  const approver = await assertHrLineApprover(lineUserId)
  if (!approver) return null
  if (canApproveHrRequests(approver.role) || isDev(approver.role)) return approver
  return null
}
