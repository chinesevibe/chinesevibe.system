import { LEAVE_TYPE_LABELS, LEAVE_TYPES, type LeaveType } from "@/features/leave/types"
import { type LeavePolicyRow } from "@/features/leaves/policy"
import { createClient } from "@/lib/supabase/server"

const DAY_MS = 86_400_000

export type CalendarLeave = {
  date: string
  employeeName: string
  type: LeaveType
  typeLabel: string
}

export type LeaveReportRow = {
  type: LeaveType
  typeLabel: string
  requestCount: number
  totalDays: number
}

export type EmployeeBalanceRow = {
  employeeId: string
  employeeName: string
  department: string | null
  balances: Array<{
    type: LeaveType
    total: number
    used: number
    remaining: number
  }>
}

export async function getLeavePolicies(): Promise<LeavePolicyRow[]> {
  const supabase = await createClient()

  const { data: current, error } = await supabase
    .from("hr_leave_policy_defaults")
    .select("leave_type, annual_days")

  if (error) throw error

  const existing = new Set((current ?? []).map((row) => row.leave_type))
  const missing = LEAVE_TYPES.filter((leaveType) => !existing.has(leaveType))

  if (missing.length > 0) {
    const { error: upsertError } = await supabase
      .from("hr_leave_policy_defaults")
      .upsert(
        missing.map((leaveType) => ({
          leave_type: leaveType,
          annual_days: 0,
        }))
      )

    if (upsertError) throw upsertError
  }

  const map = new Map(
    [...(current ?? []), ...missing.map((leaveType) => ({ leave_type: leaveType, annual_days: 0 }))].map(
      (row) => [row.leave_type as LeaveType, Number(row.annual_days)]
    )
  )

  return LEAVE_TYPES.map((leaveType) => ({
    leaveType,
    label: LEAVE_TYPE_LABELS[leaveType],
    annualDays: map.get(leaveType) ?? 0,
  }))
}

function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number)
  const start = `${month}-01`
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const end = `${month}-${String(lastDay).padStart(2, "0")}`
  return { start, end }
}

function datesInRange(start: string, end: string): string[] {
  const dates: string[] = []
  let t = Date.parse(`${start}T00:00:00Z`)
  const endT = Date.parse(`${end}T00:00:00Z`)
  while (t <= endT) {
    dates.push(new Date(t).toISOString().slice(0, 10))
    t += DAY_MS
  }
  return dates
}

function currentMonth(): string {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

export function normalizeLeaveView(raw: {
  [key: string]: string | string[] | undefined
}): { view: "requests" | "calendar" | "report" | "balances"; month: string } {
  const get = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : "")
  const viewRaw = get("view")
  const view =
    viewRaw === "calendar" || viewRaw === "report" || viewRaw === "balances"
      ? viewRaw
      : "requests"
  const month = /^\d{4}-\d{2}$/.test(get("month")) ? get("month") : currentMonth()
  return { view, month }
}

export async function getLeaveCalendar(month: string): Promise<CalendarLeave[]> {
  const supabase = await createClient()
  const { start, end } = monthRange(month)

  const { data, error } = await supabase
    .from("hr_leaves")
    .select("type, start_date, end_date, hr_employees!employee_id!inner(name)")
    .eq("status", "approved")
    .lte("start_date", end)
    .gte("end_date", start)

  if (error) throw error

  type Raw = {
    type: string
    start_date: string
    end_date: string
    hr_employees: { name: string } | Array<{ name: string }>
  }

  const entries: CalendarLeave[] = []
  for (const row of (data ?? []) as Raw[]) {
    const name = Array.isArray(row.hr_employees)
      ? row.hr_employees[0].name
      : row.hr_employees.name
    const clipStart = row.start_date < start ? start : row.start_date
    const clipEnd = row.end_date > end ? end : row.end_date
    const type = row.type as LeaveType
    for (const date of datesInRange(clipStart, clipEnd)) {
      entries.push({
        date,
        employeeName: name,
        type,
        typeLabel: LEAVE_TYPE_LABELS[type],
      })
    }
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date))
}

export async function getLeaveReport(month: string): Promise<LeaveReportRow[]> {
  const supabase = await createClient()
  const { start, end } = monthRange(month)

  const { data, error } = await supabase
    .from("hr_leaves")
    .select("type, start_date, end_date")
    .eq("status", "approved")
    .lte("start_date", end)
    .gte("end_date", start)

  if (error) throw error

  const stats = new Map<LeaveType, { count: number; days: number }>()
  for (const type of LEAVE_TYPES) {
    stats.set(type, { count: 0, days: 0 })
  }

  for (const row of data ?? []) {
    const type = row.type as LeaveType
    if (!stats.has(type)) continue
    const clipStart = row.start_date < start ? start : row.start_date
    const clipEnd = row.end_date > end ? end : row.end_date
    const days = datesInRange(clipStart, clipEnd).length
    const cur = stats.get(type)!
    stats.set(type, { count: cur.count + 1, days: cur.days + days })
  }

  return LEAVE_TYPES.map((type) => ({
    type,
    typeLabel: LEAVE_TYPE_LABELS[type],
    requestCount: stats.get(type)!.count,
    totalDays: stats.get(type)!.days,
  }))
}

export async function getLeaveBalances(): Promise<EmployeeBalanceRow[]> {
  const supabase = await createClient()

  const { data: employees, error: empError } = await supabase
    .from("hr_employees")
    .select("id, name, department")
    .eq("status", "active")
    .order("name")

  if (empError) throw empError

  const { data: balances, error: balError } = await supabase
    .from("hr_leave_balances")
    .select("employee_id, leave_type, total_days, used_days")

  if (balError) throw balError

  const byEmployee = new Map<string, EmployeeBalanceRow["balances"]>()
  for (const b of balances ?? []) {
    const type = b.leave_type as LeaveType
    if (!LEAVE_TYPES.includes(type)) continue
    const list = byEmployee.get(b.employee_id) ?? []
    list.push({
      type,
      total: Number(b.total_days),
      used: Number(b.used_days),
      remaining: Number(b.total_days) - Number(b.used_days),
    })
    byEmployee.set(b.employee_id, list)
  }

  return (employees ?? []).map((e) => ({
    employeeId: e.id,
    employeeName: e.name,
    department: e.department,
    balances: byEmployee.get(e.id) ?? [],
  }))
}

export function buildCalendarGrid(month: string): Array<{ date: string | null; day: number | null }> {
  const [y, m] = month.split("-").map(Number)
  const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const cells: Array<{ date: string | null; day: number | null }> = []

  for (let i = 0; i < firstDow; i++) cells.push({ date: null, day: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${month}-${String(d).padStart(2, "0")}`
    cells.push({ date, day: d })
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null })
  return cells
}
