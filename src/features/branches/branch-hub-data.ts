import { ictToday } from "@/features/employees/data"
import type { BranchDashboardData } from "@/features/branch-dashboard/data"
import { getBranchDashboardDataForBranch } from "@/features/branch-dashboard/data"
import {
  getBranchAttendanceQueue,
  getBranchLeaveQueue,
  getBranchOvertimeQueue,
} from "@/features/branches/branch-queues"
import { fetchBranchById, fetchBranchBySlug } from "@/features/branches/branch-query"
import {
  EMPLOYEE_VIA_ATTENDANCE,
  EMPLOYEE_VIA_ATTENDANCE_SUBMISSION,
  EMPLOYEE_VIA_LEAVE,
  EMPLOYEE_VIA_OVERTIME,
} from "@/lib/supabase/employee-embeds"
import { createClient } from "@/lib/supabase/server"

export {
  getBranchAttendanceQueue,
  getBranchLeaveQueue,
  getBranchOvertimeQueue,
} from "@/features/branches/branch-queues"

const COMPLIANCE_WINDOW_DAYS = 60
const DAY_MS = 86_400_000

export type BranchDetail = {
  id: string
  name: string
  code: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  geofence_radius_m: number
  geofence_enabled: boolean
  manager_employee_id: string | null
  manager_name: string | null
}

export type BranchEmployeeAlerts = {
  pendingLeave: number
  pendingAttendance: number
  pendingOvertime: number
  pendingApproval: boolean
  complianceDue: boolean
}

export type BranchEmployeeStats = {
  attendanceDaysThisMonth: number
  leaveDaysThisMonth: number
}

export type BranchEmployeeWithAlerts = {
  id: string
  name: string
  employee_code: string | null
  phone: string | null
  department: string | null
  position: string | null
  status: string
  role: string
  stats: BranchEmployeeStats
  alerts: BranchEmployeeAlerts
}

export async function getBranchById(branchId: string): Promise<BranchDetail | null> {
  const supabase = await createClient()
  return fetchBranchById(supabase, branchId)
}

export async function getBranchBySlug(slug: string): Promise<BranchDetail | null> {
  const supabase = await createClient()
  return fetchBranchBySlug(supabase, slug)
}

export async function getBranchHubDashboard(
  branchId: string
): Promise<BranchDashboardData> {
  return getBranchDashboardDataForBranch(branchId)
}

function countByEmployee(
  rows: Array<{ employee_id?: string }>,
  key: "employee_id" = "employee_id"
): Map<string, number> {
  const map = new Map<string, number>()
  for (const row of rows) {
    const id = row[key]
    if (!id) continue
    map.set(id, (map.get(id) ?? 0) + 1)
  }
  return map
}

function ictMonthStart(today: string): string {
  return `${today.slice(0, 7)}-01`
}

export async function getBranchEmployeesWithAlerts(
  branchId: string
): Promise<BranchEmployeeWithAlerts[]> {
  const supabase = await createClient()
  const today = ictToday()
  const monthStart = ictMonthStart(today)
  const windowEnd = new Date(
    Date.parse(`${today}T00:00:00Z`) + COMPLIANCE_WINDOW_DAYS * DAY_MS
  )
    .toISOString()
    .slice(0, 10)

  const [
    employeesRes,
    leavesRes,
    attendanceRes,
    overtimeRes,
    attMonthRes,
    approvedLeavesMonthRes,
  ] = await Promise.all([
    supabase
      .from("hr_employees")
      .select(
        "id, name, employee_code, phone, department, position, status, role, probation_end, visa_expiry, work_permit_expiry"
      )
      .eq("branch_id", branchId)
      .order("name"),
    supabase
      .from("hr_leaves")
      .select(`employee_id, ${EMPLOYEE_VIA_LEAVE}!inner(branch_id)`)
      .eq("hr_employees.branch_id", branchId)
      .eq("status", "pending"),
    supabase
      .from("hr_attendance_submissions")
      .select(`employee_id, ${EMPLOYEE_VIA_ATTENDANCE_SUBMISSION}!inner(branch_id)`)
      .eq("hr_employees.branch_id", branchId)
      .in("approval_status", ["pending_manager", "pending_hr"]),
    supabase
      .from("hr_overtime_requests")
      .select(`employee_id, ${EMPLOYEE_VIA_OVERTIME}!inner(branch_id)`)
      .eq("hr_employees.branch_id", branchId)
      .eq("approval_status", "pending_hr"),
    supabase
      .from("hr_attendance")
      .select(`employee_id, ${EMPLOYEE_VIA_ATTENDANCE}!inner(branch_id)`)
      .eq("hr_employees.branch_id", branchId)
      .gte("check_in_at", `${monthStart}T00:00:00+07:00`),
    supabase
      .from("hr_leaves")
      .select(
        `employee_id, start_date, end_date, leave_unit, leave_hours, ${EMPLOYEE_VIA_LEAVE}!inner(branch_id)`
      )
      .eq("hr_employees.branch_id", branchId)
      .eq("approval_status", "approved")
      .gte("end_date", monthStart)
      .lte("start_date", today),
  ])

  if (employeesRes.error) throw employeesRes.error
  if (leavesRes.error) throw leavesRes.error
  if (attendanceRes.error) throw attendanceRes.error
  if (overtimeRes.error) throw overtimeRes.error
  if (attMonthRes.error) throw attMonthRes.error
  if (approvedLeavesMonthRes.error) throw approvedLeavesMonthRes.error

  const leaveCounts = countByEmployee(
    (leavesRes.data ?? []).map((r) => ({
      employee_id: r.employee_id as string,
    }))
  )
  const attCounts = countByEmployee(
    (attendanceRes.data ?? []).map((r) => ({
      employee_id: r.employee_id as string,
    }))
  )
  const otCounts = countByEmployee(
    (overtimeRes.data ?? []).map((r) => ({
      employee_id: r.employee_id as string,
    }))
  )
  const attMonthCounts = countByEmployee(
    (attMonthRes.data ?? []).map((r) => ({
      employee_id: r.employee_id as string,
    }))
  )

  const leaveDaysByEmployee = new Map<string, number>()
  for (const row of approvedLeavesMonthRes.data ?? []) {
    const id = row.employee_id as string
    const unit = row.leave_unit as string | null
    let days = 1
    if (unit === "hours") {
      days = Math.max(1, Math.ceil(Number(row.leave_hours ?? 0) / 8))
    } else {
      const start = Date.parse(`${row.start_date as string}T00:00:00Z`)
      const end = Date.parse(`${row.end_date as string}T00:00:00Z`)
      days = Math.max(1, Math.floor((end - start) / DAY_MS) + 1)
    }
    leaveDaysByEmployee.set(id, (leaveDaysByEmployee.get(id) ?? 0) + days)
  }

  return (employeesRes.data ?? []).map((row) => {
    const probation = row.probation_end as string | null
    const visa = row.visa_expiry as string | null
    const permit = row.work_permit_expiry as string | null
    const complianceDue = [probation, visa, permit].some(
      (d) => d && d >= today && d <= windowEnd
    )

    return {
      id: row.id as string,
      name: row.name as string,
      employee_code: row.employee_code as string | null,
      phone: row.phone as string | null,
      department: row.department as string | null,
      position: row.position as string | null,
      status: row.status as string,
      role: row.role as string,
      stats: {
        attendanceDaysThisMonth: attMonthCounts.get(row.id as string) ?? 0,
        leaveDaysThisMonth: leaveDaysByEmployee.get(row.id as string) ?? 0,
      },
      alerts: {
        pendingLeave: leaveCounts.get(row.id as string) ?? 0,
        pendingAttendance: attCounts.get(row.id as string) ?? 0,
        pendingOvertime: otCounts.get(row.id as string) ?? 0,
        pendingApproval:
          row.status === "inactive" && row.role === "employee",
        complianceDue,
      },
    }
  })
}

