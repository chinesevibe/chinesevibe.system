import {
  EMPLOYEE_VIA_ATTENDANCE_SUBMISSION,
  EMPLOYEE_VIA_LEAVE,
  EMPLOYEE_VIA_OVERTIME,
} from "@/lib/supabase/employee-embeds"
import { createClient } from "@/lib/supabase/server"

export async function getBranchAttendanceQueue(branchId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("hr_attendance_submissions")
    .select(
      `id, work_date, submitted_at, approval_status, ${EMPLOYEE_VIA_ATTENDANCE_SUBMISSION}!inner(name, branch_id)`
    )
    .eq("hr_employees.branch_id", branchId)
    .in("approval_status", ["pending_manager", "pending_hr"])
    .order("submitted_at", { ascending: true })
    .limit(50)

  if (error) throw error
  return data ?? []
}

export async function getBranchLeaveQueue(branchId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("hr_leaves")
    .select(
      `id, type, start_date, end_date, leave_unit, leave_hours, approval_status, ${EMPLOYEE_VIA_LEAVE}!inner(name, branch_id)`
    )
    .eq("hr_employees.branch_id", branchId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(50)

  if (error) throw error
  return data ?? []
}

export async function getBranchOvertimeQueue(branchId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("hr_overtime_requests")
    .select(
      `id, work_date, start_time, end_time, approval_status, ${EMPLOYEE_VIA_OVERTIME}!inner(name, branch_id)`
    )
    .eq("hr_employees.branch_id", branchId)
    .eq("approval_status", "pending_hr")
    .order("submitted_at", { ascending: true })
    .limit(50)

  if (error) throw error
  return data ?? []
}
