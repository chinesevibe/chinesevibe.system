import { OT_STATUS_LABELS, type OtStatus } from "@/features/overtime/types"
import { createClient } from "@/lib/supabase/server"

export const OT_PAGE_SIZE = 20

export type OvertimeRequestRow = {
  id: string
  employeeId: string
  employeeName: string
  department: string | null
  workDate: string
  startTime: string
  endTime: string
  reason: string
  status: OtStatus
  approvalStatus: string
  decisionNote: string | null
  createdAt: string
}

export async function getOvertimeRequests(page = 1, status: OtStatus | "all" = "all") {
  const supabase = await createClient()

  let query = supabase
    .from("hr_overtime_requests")
    .select(
      "id, employee_id, work_date, start_time, end_time, reason, status, approval_status, decision_note, created_at, hr_employees!employee_id!inner(name, department)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })

  if (status !== "all") {
    query = query.eq("status", status)
  }

  const { data, count, error } = await query.range(
    (page - 1) * OT_PAGE_SIZE,
    page * OT_PAGE_SIZE - 1
  )
  if (error) throw error

  type Raw = {
    id: string
    employee_id: string
    work_date: string
    start_time: string
    end_time: string
    reason: string
    status: string
    approval_status: string
    decision_note: string | null
    created_at: string
    hr_employees: { name: string; department: string | null } | { name: string; department: string | null }[]
  }

  const rows: OvertimeRequestRow[] = ((data ?? []) as Raw[]).map((row) => {
    const emp = Array.isArray(row.hr_employees) ? row.hr_employees[0] : row.hr_employees
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: emp.name,
      department: emp.department,
      workDate: row.work_date,
      startTime: row.start_time.slice(0, 5),
      endTime: row.end_time.slice(0, 5),
      reason: row.reason,
      status: row.status as OtStatus,
      approvalStatus: row.approval_status,
      decisionNote: row.decision_note,
      createdAt: row.created_at,
    }
  })

  const pending = await supabase
    .from("hr_overtime_requests")
    .select("id", { count: "exact", head: true })
    .eq("approval_status", "pending_hr")

  return { rows, total: count ?? 0, pendingCount: pending.count ?? 0 }
}

export { OT_STATUS_LABELS }
