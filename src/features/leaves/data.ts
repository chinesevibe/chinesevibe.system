import { countLeaveDays } from "@/features/leave/types"
import type { LeaveType } from "@/features/leave/types"
import {
  LEAVE_PAGE_SIZE,
  type LeaveRequestRow,
  type LeaveStatusFilter,
} from "@/features/leaves/types"
import { createClient } from "@/lib/supabase/server"

export { LEAVE_PAGE_SIZE } from "@/features/leaves/types"
export type { LeaveRequestRow, LeaveStatusFilter } from "@/features/leaves/types"

export type LeaveListParams = {
  status?: LeaveStatusFilter
  page?: number
}

export function normalizeLeaveParams(raw: {
  [key: string]: string | string[] | undefined
}): Required<LeaveListParams> {
  const get = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : "")
  const status = (["pending", "approved", "rejected"] as const).includes(
    get("status") as "pending"
  )
    ? (get("status") as LeaveStatusFilter)
    : "all"
  const page = Math.max(1, Number.parseInt(get("page"), 10) || 1)
  return { status, page }
}

function employeeJoin(
  joined:
    | { name: string; department: string | null }
    | Array<{ name: string; department: string | null }>
): { name: string; department: string | null } {
  return Array.isArray(joined) ? joined[0] : joined
}

export async function getLeaveRequests(params: Required<LeaveListParams>) {
  const supabase = await createClient()

  let query = supabase
    .from("hr_leaves")
    .select(
      "id, employee_id, type, start_date, end_date, reason, status, attachment_url, decision_note, created_at, hr_employees!employee_id!inner(name, department)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })

  if (params.status !== "all") {
    query = query.eq("status", params.status)
  }

  const { data, count, error } = await query.range(
    (params.page - 1) * LEAVE_PAGE_SIZE,
    params.page * LEAVE_PAGE_SIZE - 1
  )
  if (error) throw error

  type RawRow = {
    id: string
    employee_id: string
    type: string
    start_date: string
    end_date: string
    reason: string | null
    status: string
    attachment_url: string | null
    decision_note: string | null
    created_at: string
    hr_employees:
      | { name: string; department: string | null }
      | Array<{ name: string; department: string | null }>
  }

  const rows: LeaveRequestRow[] = ((data ?? []) as RawRow[]).map((row) => {
    const emp = employeeJoin(row.hr_employees)
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: emp.name,
      department: emp.department,
      type: row.type as LeaveType,
      startDate: row.start_date,
      endDate: row.end_date,
      dayCount: countLeaveDays(row.start_date, row.end_date) ?? 0,
      reason: row.reason,
      attachmentUrl: row.attachment_url,
      status: row.status as LeaveRequestRow["status"],
      decisionNote: row.decision_note,
      createdAt: row.created_at,
    }
  })

  const { count: pendingCount } = await supabase
    .from("hr_leaves")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")

  return { rows, total: count ?? 0, pendingCount: pendingCount ?? 0 }
}
