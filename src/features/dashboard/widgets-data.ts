import { DOC_TYPE_LABELS, type DocType } from "@/features/documents/types"
import { ONBOARDING_PENDING_OR_FILTER } from "@/features/employees/data"
import { COMPLAINT_STATUS_LABELS, type ComplaintStatus } from "@/features/complaints/types"
import { LEAVE_TYPE_LABELS, type LeaveType } from "@/features/leave/types"
import { ictDayRangeUtc, formatIctTime } from "@/lib/attendance/late"
import { createClient } from "@/lib/supabase/server"
import { BRANCH_VIA_EMPLOYEE } from "@/lib/supabase/branch-embeds"
import { EMPLOYEE_VIA_ATTENDANCE } from "@/lib/supabase/employee-embeds"

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

export type PendingApprovalKind =
  | "registration"
  | "onboarding"
  | "leave"
  | "overtime"
  | "attendance"
  | "document"
  | "location_review"

export type PendingApprovalItem = {
  id: string
  kind: PendingApprovalKind
  title: string
  summary: string
  href: string
  createdAt: string | null
}

export type ComplaintReminderItem = {
  id: string
  ticketCode: string
  subject: string
  status: ComplaintStatus
  employeeName: string | null
  isAnonymous: boolean
  createdAt: string | null
}

export type NewHireItem = {
  id: string
  name: string
  position: string | null
  contractStart: string | null
  status: "completed" | "in_progress" | "pending"
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

function employeeJoin<T extends { name: string }>(
  joined: T | Array<T> | null | undefined
): T | null {
  if (!joined) return null
  return Array.isArray(joined) ? joined[0] : joined
}

function approvalTime(iso: string | null): number {
  if (!iso) return 0
  const normalized = iso.includes("T") ? iso : `${iso}T12:00:00Z`
  const t = Date.parse(normalized)
  return Number.isNaN(t) ? 0 : t
}

function sortPendingApprovals(items: PendingApprovalItem[]): PendingApprovalItem[] {
  return [...items].sort(
    (a, b) => approvalTime(b.createdAt) - approvalTime(a.createdAt)
  )
}

const PENDING_DOC_STATUSES = ["pending", "on_hold", "processing", "ready"] as const
const PENDING_APPROVAL_FETCH_LIMIT = 30
const PENDING_APPROVAL_DISPLAY_LIMIT = 8

export async function getDashboardWidgets() {
  const supabase = await createClient()
  const { start: todayStart, end: todayEnd } = ictDayRangeUtc(new Date())

  const [
    pendingLeavesRes,
    attendanceRes,
    pendingRegRes,
    pendingRegCountRes,
    pendingDocsRes,
    onboardingQueueRes,
    onboardingCompletedRes,
    onboardingApprovalRes,
    leavePendingRes,
    leavePendingCountRes,
    attSubmissionRes,
    attSubmissionCountRes,
    otRes,
    otCountRes,
    docRequestsRes,
    docRequestCountRes,
    locationReviewRes,
    locationReviewCountRes,
    complaintsRes,
    complaintsCountRes,
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
        `id, check_in_at, check_out_at, is_late, ${EMPLOYEE_VIA_ATTENDANCE}!inner(name)`
      )
      .gte("check_in_at", todayStart.toISOString())
      .lt("check_in_at", todayEnd.toISOString())
      .order("check_in_at", { ascending: false })
      .limit(20),
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
    supabase
      .from("hr_employees")
      .select(
        `id, employee_code, name, phone, status, branch_id, created_at, ${BRANCH_VIA_EMPLOYEE}(name)`
      )
      .or(ONBOARDING_PENDING_OR_FILTER)
      .order("created_at", { ascending: false })
      .limit(PENDING_APPROVAL_FETCH_LIMIT),
    supabase
      .from("hr_leaves")
      .select(
        "id, type, start_date, end_date, created_at, approval_status, hr_employees!employee_id(name)"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(PENDING_APPROVAL_FETCH_LIMIT),
    supabase
      .from("hr_leaves")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("hr_attendance_submissions")
      .select("id, work_date, submitted_at, hr_employees!employee_id(name)")
      .eq("approval_status", "pending_hr")
      .order("submitted_at", { ascending: false })
      .limit(PENDING_APPROVAL_FETCH_LIMIT),
    supabase
      .from("hr_attendance_submissions")
      .select("id", { count: "exact", head: true })
      .eq("approval_status", "pending_hr"),
    supabase
      .from("hr_overtime_requests")
      .select(
        "id, work_date, start_time, end_time, submitted_at, hr_employees!employee_id(name)"
      )
      .eq("approval_status", "pending_hr")
      .order("submitted_at", { ascending: false })
      .limit(PENDING_APPROVAL_FETCH_LIMIT),
    supabase
      .from("hr_overtime_requests")
      .select("id", { count: "exact", head: true })
      .eq("approval_status", "pending_hr"),
    supabase
      .from("hr_document_requests")
      .select("id, doc_type, status, created_at, hr_employees!inner(name)")
      .in("status", [...PENDING_DOC_STATUSES])
      .order("created_at", { ascending: false })
      .limit(PENDING_APPROVAL_FETCH_LIMIT),
    supabase
      .from("hr_document_requests")
      .select("id", { count: "exact", head: true })
      .in("status", [...PENDING_DOC_STATUSES]),
    supabase
      .from("hr_attendance")
      .select(`id, check_in_at, ${EMPLOYEE_VIA_ATTENDANCE}!inner(name)`)
      .eq("location_review_status", "pending_hr")
      .order("check_in_at", { ascending: false })
      .limit(PENDING_APPROVAL_FETCH_LIMIT),
    supabase
      .from("hr_attendance")
      .select("id", { count: "exact", head: true })
      .eq("location_review_status", "pending_hr"),
    supabase
      .from("hr_complaints")
      .select(
        "id, ticket_code, subject, status, is_anonymous, created_at, hr_employees(name)"
      )
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("hr_complaints")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
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
      employeeName: emp?.name ?? "—",
      department: emp?.department ?? null,
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

  const pendingApprovalItems: PendingApprovalItem[] = []

  for (const row of onboardingApprovalRes.data ?? []) {
    const branch = employeeJoin(
      row.hr_branches as
        | { name: string }
        | Array<{ name: string }>
        | null
        | undefined
    )
    const pendingRegistration = row.status === "inactive"
    const needsBranch = row.status === "active" && row.branch_id === null
    pendingApprovalItems.push({
      id: `${pendingRegistration ? "registration" : "onboarding"}-${row.id}`,
      kind: pendingRegistration ? "registration" : "onboarding",
      title: pendingRegistration ? "ลงทะเบียนรออนุมัติ" : "รอกำหนดสาขา",
      summary: [
        row.employee_code as string | null,
        row.name as string,
        branch?.name,
        row.phone as string | null,
        needsBranch ? "ยังไม่กำหนดสาขา" : null,
      ]
        .filter(Boolean)
        .join(" · "),
      href: `/admin/employees/${row.id as string}`,
      createdAt: row.created_at as string | null,
    })
  }

  for (const row of leavePendingRes.data ?? []) {
    const typeLabel =
      LEAVE_TYPE_LABELS[row.type as LeaveType] ?? (row.type as string)
    const approvalStatus = row.approval_status as string | null
    pendingApprovalItems.push({
      id: `leave-${row.id}`,
      kind: "leave",
      title:
        approvalStatus === "pending_manager"
          ? "ขอลารอ BM อนุมัติ"
          : approvalStatus === "pending_hr"
            ? "ขอลารอ HR อนุมัติ"
            : "ขอลารออนุมัติ",
      summary: `${employeeJoin(row.hr_employees as { name: string } | Array<{ name: string }>)?.name ?? "—"} · ${typeLabel} ${row.start_date}–${row.end_date}`,
      href: "/admin/leaves?status=pending",
      createdAt: row.created_at as string | null,
    })
  }

  for (const row of attSubmissionRes.data ?? []) {
    pendingApprovalItems.push({
      id: `attendance-${row.id}`,
      kind: "attendance",
      title: "ส่งเวลางานรอ HR อนุมัติ",
      summary: `${employeeJoin(row.hr_employees as { name: string } | Array<{ name: string }>)?.name ?? "—"} · วันที่ ${row.work_date}`,
      href: "/admin/attendance",
      createdAt: row.submitted_at as string | null,
    })
  }

  for (const row of otRes.data ?? []) {
    pendingApprovalItems.push({
      id: `overtime-${row.id}`,
      kind: "overtime",
      title: "ขอ OT รออนุมัติ",
      summary: `${employeeJoin(row.hr_employees as { name: string } | Array<{ name: string }>)?.name ?? "—"} · ${row.work_date} ${row.start_time}–${row.end_time}`,
      href: "/admin/overtime",
      createdAt: row.submitted_at as string | null,
    })
  }

  for (const row of docRequestsRes.data ?? []) {
    const docLabel =
      DOC_TYPE_LABELS[row.doc_type as DocType] ?? (row.doc_type as string)
    pendingApprovalItems.push({
      id: `document-${row.id}`,
      kind: "document",
      title: "ขอเอกสารรอดำเนินการ",
      summary: `${employeeJoin(row.hr_employees as { name: string } | Array<{ name: string }>)?.name ?? "—"} · ${docLabel}`,
      href: "/admin/documents?status=pending",
      createdAt: row.created_at as string | null,
    })
  }

  for (const row of locationReviewRes.data ?? []) {
    pendingApprovalItems.push({
      id: `location-${row.id}`,
      kind: "location_review",
      title: "พิกัดเช็คอินรอตรวจ",
      summary: `${employeeJoin(row.hr_employees as { name: string } | Array<{ name: string }>)?.name ?? "—"} · ${formatIctTime(new Date(row.check_in_at as string))}`,
      href: "/admin/attendance",
      createdAt: row.check_in_at as string | null,
    })
  }

  const pendingApprovals = sortPendingApprovals(pendingApprovalItems).slice(
    0,
    PENDING_APPROVAL_DISPLAY_LIMIT
  )

  const onboardingBranchlessCount = (onboardingApprovalRes.data ?? []).filter(
    (row) => row.status === "active" && row.branch_id === null
  ).length

  const pendingApprovalCount =
    (pendingRegCountRes.count ?? 0) +
    onboardingBranchlessCount +
    (leavePendingCountRes.count ?? 0) +
    (attSubmissionCountRes.count ?? 0) +
    (otCountRes.count ?? 0) +
    (docRequestCountRes.count ?? 0) +
    (locationReviewCountRes.count ?? 0)

  const complaintReminders: ComplaintReminderItem[] = (
    (complaintsRes.data ?? []) as Array<{
      id: string
      ticket_code: string
      subject: string
      status: ComplaintStatus
      is_anonymous: boolean
      created_at: string | null
      hr_employees: { name: string } | Array<{ name: string }> | null
    }>
  ).map((row) => ({
    id: row.id,
    ticketCode: row.ticket_code,
    subject: row.subject,
    status: row.status,
    isAnonymous: row.is_anonymous,
    employeeName: row.is_anonymous
      ? null
      : (employeeJoin(row.hr_employees)?.name ?? null),
    createdAt: row.created_at,
  }))

  const openComplaintCount = complaintsCountRes.count ?? complaintReminders.length

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
    complaintReminders,
    openComplaintCount,
    exceptionCount: exceptions.length,
    onboardingDonut,
    newHires: newHires.slice(0, 5),
    pendingOnboarding,
    pendingRegistrations,
    pendingRegistrationCount: pendingRegCountRes.count ?? pendingRegistrations.length,
    pendingDocuments,
    pendingDocumentCount,
    pendingApprovals,
    pendingApprovalCount,
  }
}
