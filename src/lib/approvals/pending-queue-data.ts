import { ONBOARDING_PENDING_OR_FILTER } from "@/features/employees/data"
import { DOC_TYPE_LABELS, type DocType } from "@/features/documents/types"
import { LEAVE_TYPE_LABELS, type LeaveType } from "@/features/leave/types"
import type { HrApprovalCounts } from "@/features/notifications/nav-badges"
import { getAdminClient } from "@/lib/auth/admin-client"
import { formatThaiDateTime } from "@/lib/datetime/thailand"
import { BRANCH_VIA_EMPLOYEE } from "@/lib/supabase/branch-embeds"
import { EMPLOYEE_VIA_ATTENDANCE } from "@/lib/supabase/employee-embeds"

import type { PendingQueueItem, PendingQueuePayload } from "./pending-queue-types"

export type {
  PendingQueueCategory,
  PendingQueueItem,
  PendingQueuePayload,
} from "./pending-queue-types"
export { PENDING_QUEUE_CATEGORIES } from "./pending-queue-types"

const LIST_LIMIT = 50

export async function fetchHrApprovalCounts(): Promise<HrApprovalCounts> {
  const admin = getAdminClient()
  const [
    registrationCountRes,
    onboardingCountRes,
    leaveHrCountRes,
    attCountRes,
    otCountRes,
    docCountRes,
    complaintCountRes,
  ] = await Promise.all([
    admin
      .from("hr_employees")
      .select("id", { count: "exact", head: true })
      .eq("status", "inactive")
      .eq("role", "employee"),
    admin
      .from("hr_employees")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("role", "employee")
      .is("branch_id", null),
    admin
      .from("hr_leaves")
      .select("id", { count: "exact", head: true })
      .eq("approval_status", "pending_hr"),
    admin
      .from("hr_attendance")
      .select("id", { count: "exact", head: true })
      .eq("location_review_status", "pending_hr"),
    admin
      .from("hr_overtime_requests")
      .select("id", { count: "exact", head: true })
      .eq("approval_status", "pending_hr"),
    admin
      .from("hr_document_requests")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "on_hold", "processing", "ready"]),
    admin
      .from("hr_complaints")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
  ])

  return {
    registration: registrationCountRes.count ?? 0,
    onboarding: onboardingCountRes.count ?? 0,
    leavePending: leaveHrCountRes.count ?? 0,
    leaveHr: leaveHrCountRes.count ?? 0,
    attendance: attCountRes.count ?? 0,
    overtime: otCountRes.count ?? 0,
    document: docCountRes.count ?? 0,
    complaint: complaintCountRes.count ?? 0,
  }
}

function employeeName(join: unknown): string {
  const emp = Array.isArray(join) ? join[0] : join
  return (emp as { name?: string } | null)?.name ?? "—"
}

export async function fetchPendingQueuePayload(): Promise<PendingQueuePayload> {
  const admin = getAdminClient()
  const counts = await fetchHrApprovalCounts()

  const [registrations, leaves, otRows, docs, complaints, attendanceRows] =
    await Promise.all([
      admin
        .from("hr_employees")
        .select(`id, name, employee_code, status, ${BRANCH_VIA_EMPLOYEE}(name)`)
        .or(ONBOARDING_PENDING_OR_FILTER)
        .order("created_at", { ascending: false })
        .limit(LIST_LIMIT),
      admin
        .from("hr_leaves")
        .select(
          "id, type, start_date, end_date, leave_unit, leave_hours, submitted_at, hr_employees!employee_id(name)"
        )
        .eq("approval_status", "pending_hr")
        .order("submitted_at", { ascending: true })
        .limit(LIST_LIMIT),
      admin
        .from("hr_overtime_requests")
        .select(
          "id, work_date, start_time, end_time, submitted_at, hr_employees!employee_id(name)"
        )
        .eq("approval_status", "pending_hr")
        .order("submitted_at", { ascending: true })
        .limit(LIST_LIMIT),
      admin
        .from("hr_document_requests")
        .select("id, doc_type, status, created_at, hr_employees!inner(name)")
        .in("status", ["pending", "on_hold", "processing", "ready"])
        .order("created_at", { ascending: true })
        .limit(LIST_LIMIT),
      admin
        .from("hr_complaints")
        .select("id, ticket_code, subject, created_at")
        .eq("status", "open")
        .order("created_at", { ascending: true })
        .limit(LIST_LIMIT),
      admin
        .from("hr_attendance")
        .select(
          `id, check_in_at, location_review_flags, ${EMPLOYEE_VIA_ATTENDANCE}!inner(name)`
        )
        .eq("location_review_status", "pending_hr")
        .order("check_in_at", { ascending: true })
        .limit(LIST_LIMIT),
    ])

  const items: PendingQueueItem[] = []

  for (const row of registrations.data ?? []) {
    const branch = Array.isArray(row.hr_branches)
      ? row.hr_branches[0]
      : row.hr_branches
    const code = row.employee_code as string | null
    items.push({
      id: row.id as string,
      category: "registration",
      title: row.name as string,
      subtitle: branch ? (branch as { name: string }).name : null,
      meta: code ? `รหัส ${code}` : row.status === "inactive" ? "รออนุมัติเข้าใช้งาน" : "รอเลือกสาขา",
      decidePath: `/api/employees/${row.id as string}/registration/decide`,
      requiresHrOfficer: false,
      kind: "standard",
    })
  }

  for (const row of leaves.data ?? []) {
    const typeLabel = LEAVE_TYPE_LABELS[row.type as LeaveType] ?? String(row.type)
    const unit =
      row.leave_unit === "hours"
        ? `${row.leave_hours} ชม.`
        : `${row.start_date} – ${row.end_date}`
    items.push({
      id: row.id as string,
      category: "leave",
      title: employeeName(row.hr_employees),
      subtitle: typeLabel,
      meta: unit as string,
      decidePath: `/api/leave/${row.id as string}/decide`,
      requiresHrOfficer: true,
      kind: "standard",
    })
  }

  for (const row of otRows.data ?? []) {
    items.push({
      id: row.id as string,
      category: "overtime",
      title: employeeName(row.hr_employees),
      subtitle: String(row.work_date),
      meta: `${String(row.start_time).slice(0, 5)}–${String(row.end_time).slice(0, 5)}`,
      decidePath: `/api/overtime/${row.id as string}/decide`,
      requiresHrOfficer: true,
      kind: "standard",
    })
  }

  for (const row of docs.data ?? []) {
    const typeLabel = DOC_TYPE_LABELS[row.doc_type as DocType] ?? String(row.doc_type)
    items.push({
      id: row.id as string,
      category: "document",
      title: employeeName(row.hr_employees),
      subtitle: typeLabel,
      meta: String(row.status),
      decidePath: `/api/documents/${row.id as string}/decide`,
      requiresHrOfficer: false,
      kind: "standard",
    })
  }

  for (const row of complaints.data ?? []) {
    items.push({
      id: row.id as string,
      category: "complaint",
      title: row.subject as string,
      subtitle: row.ticket_code as string,
      meta: formatThaiDateTime(row.created_at as string),
      decidePath: `/api/complaints/${row.id as string}/reply`,
      requiresHrOfficer: false,
      kind: "complaint",
    })
  }

  for (const row of attendanceRows.data ?? []) {
    items.push({
      id: row.id as string,
      category: "attendance",
      title: employeeName(row.hr_employees),
      subtitle: "ตรวจพิกัดเช็คอิน",
      meta: formatThaiDateTime(row.check_in_at as string),
      decidePath: `/api/admin/attendance/${row.id as string}`,
      requiresHrOfficer: false,
      kind: "standard",
    })
  }

  const total =
    counts.registration +
    counts.onboarding +
    counts.leaveHr +
    counts.overtime +
    counts.document +
    counts.complaint +
    counts.attendance

  return { counts, total, items }
}
