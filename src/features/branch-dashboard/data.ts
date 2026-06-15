import { ictDayRangeUtc } from "@/lib/attendance/late"
import { ictToday } from "@/features/employees/data"
import { LEAVE_TYPE_LABELS, type LeaveType } from "@/features/leave/types"
import { getManagedBranchId } from "@/lib/auth/branch"
import type { Employee } from "@/lib/auth/session"
import { formatThaiDate } from "@/lib/datetime/thailand"
import { createClient } from "@/lib/supabase/server"

import {
  getBranchAttendanceQueue,
  getBranchLeaveQueue,
} from "@/features/branches/branch-queues"

const DAY_MS = 86_400_000
const ICT_OFFSET_MS = 7 * 60 * 60 * 1000

function ictDayLabel(dayStartUtc: Date): string {
  const ict = new Date(dayStartUtc.getTime() + ICT_OFFSET_MS)
  const dd = String(ict.getUTCDate()).padStart(2, "0")
  const mm = String(ict.getUTCMonth() + 1).padStart(2, "0")
  return `${dd}/${mm}`
}

export type BranchDashboardData = {
  branch: { id: string; name: string; code: string | null } | null
  headcount: number
  presentToday: number
  lateToday: number
  onLeaveToday: number
  absentToday: number
  otHoursMonth: number
  pendingAttendance: number
  pendingLeaves: number
  attendanceDonut: Array<{ name: string; value: number; color: string }>
  weekTrend: Array<{ day: string; rate: number }>
  pendingLeaveRows: Array<{
    id: string
    name: string
    department: string
    dates: string
    type: string
  }>
  departmentRows: Array<{
    name: string
    headcount: number
    present: number
    rate: number
  }>
  recentActivity: Array<{ text: string; time: string; kind: "leave" | "attendance" }>
  announcements: Array<{ title: string; date: string }>
  presentRate: number
}

const emptyBranchDashboard = (): BranchDashboardData => ({
  branch: null,
  headcount: 0,
  presentToday: 0,
  lateToday: 0,
  onLeaveToday: 0,
  absentToday: 0,
  otHoursMonth: 0,
  pendingAttendance: 0,
  pendingLeaves: 0,
  attendanceDonut: [],
  weekTrend: [],
  pendingLeaveRows: [],
  departmentRows: [],
  recentActivity: [],
  announcements: [],
  presentRate: 0,
})

export async function getBranchDashboardDataForBranch(
  branchId: string
): Promise<BranchDashboardData> {
  const supabase = await createClient()
  const now = new Date()
  const today = ictToday()
  const { start: todayStart, end: todayEnd } = ictDayRangeUtc(now)

  const [branchRes, employeesRes, attTodayRes, leavesTodayRes, attendanceQueue, leaveQueue, annRes] =
    await Promise.all([
      supabase.from("hr_branches").select("id, name, code").eq("id", branchId).maybeSingle(),
      supabase
        .from("hr_employees")
        .select("id, name, department, department_id")
        .eq("branch_id", branchId)
        .eq("status", "active")
        .eq("role", "employee"),
      supabase
        .from("hr_attendance")
        .select("employee_id, is_late, hr_employees!employee_id!inner(branch_id)")
        .eq("hr_employees.branch_id", branchId)
        .gte("check_in_at", todayStart.toISOString())
        .lt("check_in_at", todayEnd.toISOString()),
      supabase
        .from("hr_leaves")
        .select("employee_id, hr_employees!employee_id!inner(branch_id, name, department)")
        .eq("approval_status", "approved")
        .eq("hr_employees.branch_id", branchId)
        .lte("start_date", today)
        .gte("end_date", today),
      getBranchAttendanceQueue(branchId),
      getBranchLeaveQueue(branchId),
      supabase
        .from("hr_announcements")
        .select("title, sent_at")
        .eq("status", "sent")
        .order("sent_at", { ascending: false })
        .limit(3),
    ])

  return buildBranchDashboardPayload({
    branchRes: branchRes.data,
    employees: employeesRes.data ?? [],
    attRows: attTodayRes.data ?? [],
    leavesToday: leavesTodayRes.data ?? [],
    attendanceQueue,
    leaveQueue,
    announcements: annRes.data ?? [],
    branchId,
    todayStart,
    todayEnd,
    supabase,
  })
}

async function resolveBranchIdForCaller(caller: Employee): Promise<string | null> {
  const managed = await getManagedBranchId(caller.id)
  if (managed) return managed

  const supabase = await createClient()

  if (caller.role === "branch_manager") {
    const { data: row } = await supabase
      .from("hr_employees")
      .select("branch_id")
      .eq("id", caller.id)
      .maybeSingle()
    if (row?.branch_id) return row.branch_id as string
  }

  if (caller.role === "dev") {
    const { data: row } = await supabase
      .from("hr_branches")
      .select("id")
      .order("code", { ascending: true })
      .limit(1)
      .maybeSingle()
    if (row?.id) return row.id as string
  }

  return null
}

export async function getBranchDashboardData(
  caller: Employee
): Promise<BranchDashboardData> {
  const branchId = await resolveBranchIdForCaller(caller)
  if (!branchId) return emptyBranchDashboard()
  return getBranchDashboardDataForBranch(branchId)
}

async function buildBranchDashboardPayload({
  branchRes,
  employees,
  attRows,
  leavesToday,
  attendanceQueue,
  leaveQueue,
  announcements,
  branchId,
  todayStart,
  todayEnd,
  supabase,
}: {
  branchRes: { id: string; name: string; code: string | null } | null
  employees: Array<Record<string, unknown>>
  attRows: Array<Record<string, unknown>>
  leavesToday: Array<Record<string, unknown>> | null
  attendanceQueue: Array<Record<string, unknown>>
  leaveQueue: Array<Record<string, unknown>>
  announcements: Array<Record<string, unknown>>
  branchId: string
  todayStart: Date
  todayEnd: Date
  supabase: Awaited<ReturnType<typeof createClient>>
}): Promise<BranchDashboardData> {
  const headcount = employees.length
  const presentToday = attRows.length
  const lateToday = attRows.filter((r) => r.is_late).length
  const onLeaveToday = leavesToday?.length ?? 0
  const absentToday = Math.max(0, headcount - presentToday - onLeaveToday)

  const presentRate = headcount > 0 ? Math.round((presentToday / headcount) * 1000) / 10 : 0

  const attendanceDonut = [
    { name: "Present", value: presentToday, color: "#22c55e" },
    { name: "Late", value: lateToday, color: "#f59e0b" },
    { name: "Absent", value: absentToday, color: "#ef4444" },
    { name: "On Leave", value: onLeaveToday, color: "#3b82f6" },
  ].filter((d) => d.value > 0)

  const weekStart = new Date(todayStart.getTime() - 6 * DAY_MS)
  const { data: weekAtt } = await supabase
    .from("hr_attendance")
    .select("check_in_at, hr_employees!employee_id!inner(branch_id)")
    .eq("hr_employees.branch_id", branchId)
    .gte("check_in_at", weekStart.toISOString())
    .lt("check_in_at", todayEnd.toISOString())

  const weekTrend = Array.from({ length: 7 }, (_, i) => {
    const dayStart = new Date(weekStart.getTime() + i * DAY_MS)
    const dayEnd = new Date(dayStart.getTime() + DAY_MS)
    const count =
      (weekAtt ?? []).filter((r) => {
        const t = new Date(r.check_in_at as string).getTime()
        return t >= dayStart.getTime() && t < dayEnd.getTime()
      }).length ?? 0
    const rate = headcount > 0 ? Math.round((count / headcount) * 100) : 0
    return { day: ictDayLabel(dayStart), rate }
  })

  const deptMap = new Map<string, { headcount: number; present: Set<string> }>()
  for (const emp of employees) {
    const dept = (emp.department as string) || "Unassigned"
    const cur = deptMap.get(dept) ?? { headcount: 0, present: new Set() }
    cur.headcount += 1
    deptMap.set(dept, cur)
  }
  for (const row of attRows) {
    const emp = employees.find((e) => e.id === row.employee_id)
    if (!emp) continue
    const dept = (emp.department as string) || "Unassigned"
    const cur = deptMap.get(dept)
    if (cur) cur.present.add(emp.id as string)
  }
  const departmentRows = Array.from(deptMap, ([name, v]) => ({
    name,
    headcount: v.headcount,
    present: v.present.size,
    rate: v.headcount > 0 ? Math.round((v.present.size / v.headcount) * 100) : 0,
  })).sort((a, b) => b.headcount - a.headcount)

  const pendingLeaveRows = leaveQueue.map((r) => {
    const emp = Array.isArray(r.hr_employees) ? r.hr_employees[0] : r.hr_employees
    const typeLabel = LEAVE_TYPE_LABELS[r.type as LeaveType] ?? String(r.type)
    return {
      id: r.id as string,
      name: (emp as { name: string })?.name ?? "—",
      department: (emp as { department?: string })?.department ?? "—",
      dates:
        r.leave_unit === "hours"
          ? `${r.start_date} (${r.leave_hours}h)`
          : `${r.start_date} – ${r.end_date}`,
      type: typeLabel,
    }
  })

  const { data: otLines } = await supabase
    .from("hr_payroll_hour_lines")
    .select("hours, hr_employees!employee_id!inner(branch_id)")
    .eq("line_type", "overtime")
    .eq("hr_employees.branch_id", branchId)

  const otHoursMonth =
    Math.round(
      (otLines ?? []).reduce((s, r) => s + Number(r.hours), 0) * 10
    ) / 10

  const recentActivity: BranchDashboardData["recentActivity"] = []
  for (const l of leaveQueue.slice(0, 3)) {
    const emp = Array.isArray(l.hr_employees) ? l.hr_employees[0] : l.hr_employees
    recentActivity.push({
      text: `${(emp as { name: string })?.name ?? "—"} submitted leave request`,
      time: "Pending approval",
      kind: "leave",
    })
  }
  for (const a of attendanceQueue.slice(0, 2)) {
    const emp = Array.isArray(a.hr_employees) ? a.hr_employees[0] : a.hr_employees
    recentActivity.push({
      text: `${(emp as { name: string })?.name ?? "—"} submitted daily attendance`,
      time: "Pending approval",
      kind: "attendance",
    })
  }

  return {
    branch: branchRes,
    headcount,
    presentToday,
    lateToday,
    onLeaveToday,
    absentToday,
    otHoursMonth,
    pendingAttendance: attendanceQueue.length,
    pendingLeaves: leaveQueue.length,
    attendanceDonut,
    weekTrend,
    pendingLeaveRows,
    departmentRows,
    recentActivity,
    announcements: announcements.map((a) => ({
      title: a.title as string,
      date: a.sent_at
        ? formatThaiDate(a.sent_at as string)
        : "—",
    })),
    presentRate,
  }
}
