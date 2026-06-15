import { DOC_TYPE_LABELS, type DocType } from "@/features/documents/types"
import { ictDayRangeUtc, formatIctTime } from "@/lib/attendance/late"
import { createClient } from "@/lib/supabase/server"
import { BRANCH_VIA_EMPLOYEE } from "@/lib/supabase/branch-embeds"

export type PendingLeaveItem = {
  id: string
  employeeName: string
  department: string | null
  type: string
  startDate: string
  endDate: string
}

export type AttendanceException = {
  id: string
  employeeName: string
  kind: "late" | "no_checkout"
  detail: string
}

export type ComplianceItem = {
  employeeId: string
  employeeName: string
  kind: "probation" | "visa" | "work_permit"
  dueDate: string
  daysLeft: number
}

export type NewHireItem = {
  id: string
  name: string
  position: string | null
  contractStart: string | null
  status: "completed" | "in_progress" | "pending"
}

export type RecentAlertItem = {
  id: string
  employeeName: string
  alertType: string
  triggerDate: string
  status: string
}

export type PendingRegistrationItem = {
  id: string
  name: string
  phone: string | null
  branchName: string | null
  department: string | null
  createdAt: string | null
}

export type PendingDocumentGroup = {
  docType: DocType
  label: string
  count: number
}

const DAY_MS = 86_400_000
const ICT_OFFSET_MS = 7 * 60 * 60 * 1000

function ictToday(): string {
  return new Date(Date.now() + ICT_OFFSET_MS).toISOString().slice(0, 10)
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS
  )
}

function employeeJoin(
  joined: { name: string; department: string | null } | Array<{ name: string; department: string | null }>
) {
  return Array.isArray(joined) ? joined[0] : joined
}

export async function getDashboardWidgets() {
  const supabase = await createClient()
  const today = ictToday()
  const { start: todayStart, end: todayEnd } = ictDayRangeUtc(new Date())
  const windowEnd = new Date(Date.parse(`${today}T00:00:00Z`) + 30 * DAY_MS)
    .toISOString()
    .slice(0, 10)

  const [
    pendingLeavesRes,
    attendanceRes,
    employeesRes,
    alertsRes,
    pendingRegRes,
    pendingRegCountRes,
    pendingDocsRes,
    onboardingQueueRes,
    onboardingCompletedRes,
  ] = await Promise.all([
    supabase
      .from("hr_leaves")
      .select(
        "id, type, start_date, end_date, hr_employees!employee_id!inner(name, department)"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("hr_attendance")
      .select(
        "id, check_in_at, check_out_at, is_late, hr_employees!inner(name)"
      )
      .gte("check_in_at", todayStart.toISOString())
      .lt("check_in_at", todayEnd.toISOString())
      .order("check_in_at", { ascending: false })
      .limit(20),
    supabase
      .from("hr_employees")
      .select(
        "id, name, position, contract_start, probation_end, visa_expiry, work_permit_expiry"
      )
      .eq("status", "active"),
    supabase
      .from("hr_alerts")
      .select("id, alert_type, trigger_date, status, hr_employees!inner(name)")
      .in("status", ["pending", "failed"])
      .order("trigger_date", { ascending: false })
      .limit(5),
    supabase
      .from("hr_employees")
      .select(
        `id, name, phone, department, created_at, ${BRANCH_VIA_EMPLOYEE}(name)`
      )
      .eq("status", "inactive")
      .eq("role", "employee")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("hr_employees")
      .select("id", { count: "exact", head: true })
      .eq("status", "inactive")
      .eq("role", "employee"),
    supabase
      .from("hr_document_requests")
      .select("doc_type")
      .in("status", ["pending", "processing"]),
    supabase
      .from("hr_employees")
      .select("id, name, position, status, branch_id, created_at")
      .or(
        "and(status.eq.inactive,role.eq.employee),and(status.eq.active,role.eq.employee,branch_id.is.null)"
      )
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("hr_employees")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .not("branch_id", "is", null),
  ])

  const pendingLeaves: PendingLeaveItem[] = ((pendingLeavesRes.data ?? []) as Array<{
    id: string
    type: string
    start_date: string
    end_date: string
    hr_employees: { name: string; department: string | null } | Array<{ name: string; department: string | null }>
  }>).map((row) => {
    const emp = employeeJoin(row.hr_employees)
    return {
      id: row.id,
      employeeName: emp.name,
      department: emp.department,
      type: row.type,
      startDate: row.start_date,
      endDate: row.end_date,
    }
  })

  const exceptions: AttendanceException[] = []
  for (const row of (attendanceRes.data ?? []) as Array<{
    id: string
    check_in_at: string
    check_out_at: string | null
    is_late: boolean
    hr_employees: { name: string } | Array<{ name: string }>
  }>) {
    const name = Array.isArray(row.hr_employees)
      ? row.hr_employees[0].name
      : row.hr_employees.name
    if (row.is_late) {
      exceptions.push({
        id: row.id,
        employeeName: name,
        kind: "late",
        detail: `Late check-in ${formatIctTime(new Date(row.check_in_at))}`,
      })
    }
    if (!row.check_out_at) {
      exceptions.push({
        id: `${row.id}-out`,
        employeeName: name,
        kind: "no_checkout",
        detail: "No check-out yet",
      })
    }
  }

  const compliance: ComplianceItem[] = []
  for (const row of employeesRes.data ?? []) {
    const checks: Array<{ field: "probation_end" | "visa_expiry" | "work_permit_expiry"; kind: ComplianceItem["kind"] }> = [
      { field: "probation_end", kind: "probation" },
      { field: "visa_expiry", kind: "visa" },
      { field: "work_permit_expiry", kind: "work_permit" },
    ]
    for (const { field, kind } of checks) {
      const due = row[field] as string | null
      if (due && due >= today && due <= windowEnd) {
        compliance.push({
          employeeId: row.id,
          employeeName: row.name,
          kind,
          dueDate: due,
          daysLeft: daysBetween(today, due),
        })
      }
    }
  }
  compliance.sort((a, b) => a.daysLeft - b.daysLeft)

  let onboardingInProgress = 0
  let onboardingPending = 0
  const newHires: NewHireItem[] = []

  for (const row of onboardingQueueRes.data ?? []) {
    const createdAt = row.created_at as string | null
    if (row.status === "inactive") {
      onboardingPending += 1
      newHires.push({
        id: row.id as string,
        name: row.name as string,
        position: row.position as string | null,
        contractStart: createdAt?.slice(0, 10) ?? null,
        status: "pending",
      })
    } else {
      onboardingInProgress += 1
      newHires.push({
        id: row.id as string,
        name: row.name as string,
        position: row.position as string | null,
        contractStart: createdAt?.slice(0, 10) ?? null,
        status: "in_progress",
      })
    }
  }

  const onboardingCompleted = onboardingCompletedRes.count ?? 0

  const onboardingDonut = [
    { name: "เสร็จสิ้น", value: onboardingCompleted },
    { name: "กำลังดำเนินการ", value: onboardingInProgress },
    { name: "รอดำเนินการ", value: onboardingPending },
  ]

  const recentAlerts: RecentAlertItem[] = (
    (alertsRes.data ?? []) as Array<{
      id: string
      alert_type: string
      trigger_date: string
      status: string
      hr_employees: { name: string } | Array<{ name: string }>
    }>
  ).map((row) => ({
    id: row.id,
    employeeName: Array.isArray(row.hr_employees)
      ? row.hr_employees[0].name
      : row.hr_employees.name,
    alertType: row.alert_type,
    triggerDate: row.trigger_date,
    status: row.status,
  }))

  const pendingRegistrations: PendingRegistrationItem[] = (
    (pendingRegRes.data ?? []) as Array<{
      id: string
      name: string
      phone: string | null
      department: string | null
      created_at: string | null
      hr_branches: { name: string } | Array<{ name: string }> | null
    }>
  ).map((row) => {
    const branch = Array.isArray(row.hr_branches)
      ? row.hr_branches[0]
      : row.hr_branches
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      branchName: branch?.name ?? null,
      department: row.department,
      createdAt: row.created_at,
    }
  })

  const pendingOnboarding = onboardingInProgress + onboardingPending

  const docTypeCounts = new Map<DocType, number>()
  for (const row of pendingDocsRes.data ?? []) {
    const t = row.doc_type as DocType
    if (t in DOC_TYPE_LABELS) {
      docTypeCounts.set(t, (docTypeCounts.get(t) ?? 0) + 1)
    }
  }
  const pendingDocuments: PendingDocumentGroup[] = [...docTypeCounts.entries()]
    .map(([docType, count]) => ({
      docType,
      label: DOC_TYPE_LABELS[docType],
      count,
    }))
    .sort((a, b) => b.count - a.count)
  const pendingDocumentCount = pendingDocuments.reduce((s, d) => s + d.count, 0)

  return {
    pendingLeaves,
    exceptions: exceptions.slice(0, 6),
    compliance: compliance.slice(0, 6),
    exceptionCount: exceptions.length,
    onboardingDonut,
    newHires: newHires.slice(0, 5),
    pendingOnboarding,
    pendingRegistrations,
    pendingRegistrationCount: pendingRegCountRes.count ?? pendingRegistrations.length,
    pendingDocuments,
    pendingDocumentCount,
    recentAlerts,
    unresolvedAlerts: recentAlerts.length,
  }
}
