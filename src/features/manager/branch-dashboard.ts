import { getManagedBranchId } from "@/lib/auth/branch"
import type { Employee } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

import { getManagerAttendanceQueue, getManagerLeaveQueue } from "./data"

export async function getBranchDashboardContext(caller: Employee) {
  const supabase = await createClient()
  const branchId = await getManagedBranchId(caller.id)

  const [branchRes, attendance, leaves, teamRes] = await Promise.all([
    branchId
      ? supabase.from("hr_branches").select("id, name, code").eq("id", branchId).maybeSingle()
      : Promise.resolve({ data: null }),
    getManagerAttendanceQueue(caller),
    getManagerLeaveQueue(caller),
    branchId
      ? supabase
          .from("hr_employees")
          .select("id", { count: "exact", head: true })
          .eq("branch_id", branchId)
          .eq("status", "active")
          .eq("role", "employee")
      : Promise.resolve({ count: 0 }),
  ])

  return {
    branch: branchRes.data as { id: string; name: string; code: string | null } | null,
    pendingAttendance: attendance.length,
    pendingLeaves: leaves.length,
    teamCount: teamRes.count ?? 0,
    attendance,
    leaves,
  }
}
