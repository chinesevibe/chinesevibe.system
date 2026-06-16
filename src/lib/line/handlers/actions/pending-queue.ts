import type { messagingApi } from "@line/bot-sdk"

import { ONBOARDING_PENDING_OR_FILTER } from "@/features/employees/data"
import { DOC_TYPE_LABELS, type DocType } from "@/features/documents/types"
import { LEAVE_TYPE_LABELS, type LeaveType } from "@/features/leave/types"
import type { HrApprovalCounts } from "@/features/notifications/nav-badges"
import { getAdminClient } from "@/lib/auth/admin-client"
import { assertHrLineApprover } from "@/lib/line/approval/approver"
import {
  buildApprovalPostbackData,
  postbackButton,
} from "@/lib/line/approval/flex-buttons"
import { BRAND_RED, cardBody, brandedTitleHeader } from "@/lib/line/flex/base"
import { resolveLocaleForLineUser } from "@/lib/i18n/employee-locale"
import { t } from "@/lib/i18n/translate"
import { DEFAULT_LOCALE } from "@/lib/i18n/types"
import { BRANCH_VIA_EMPLOYEE } from "@/lib/supabase/branch-embeds"
import { EMPLOYEE_VIA_ATTENDANCE } from "@/lib/supabase/employee-embeds"

const LIST_LIMIT = 3

async function fetchHrApprovalCounts(): Promise<HrApprovalCounts> {
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

function summaryBubble(
  title: string,
  count: number,
  lines: string[],
  footerButtons: messagingApi.FlexComponent[] | null,
  locale: typeof DEFAULT_LOCALE
): messagingApi.FlexBubble {
  const bubble: messagingApi.FlexBubble = {
    type: "bubble",
    size: "mega",
    header: brandedTitleHeader({
      title,
      subtitle: t("line.pendingQueue.items", locale, { count: String(count) }),
      accentColor: BRAND_RED,
      emoji: "📋",
    }),
    body: cardBody([
      ...lines.map((line) => ({
        type: "text" as const,
        text: line,
        size: "sm" as const,
        wrap: true,
        margin: "sm" as const,
        color: "#374151",
      })),
      ...(lines.length === 0
        ? [
            {
              type: "text" as const,
              text: t("line.pendingQueue.empty", locale),
              size: "sm" as const,
              color: "#9CA3AF",
              margin: "md" as const,
            },
          ]
        : []),
    ]),
  }

  if (footerButtons && footerButtons.length > 0) {
    bubble.footer = {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      paddingAll: "12px",
      contents: footerButtons,
    }
  }

  return bubble
}

export async function buildPendingQueueMessages(
  lineUserId: string | undefined
): Promise<messagingApi.Message[]> {
  const locale = lineUserId
    ? await resolveLocaleForLineUser(lineUserId)
    : DEFAULT_LOCALE

  const approver = await assertHrLineApprover(lineUserId)
  if (!approver) {
    return [{ type: "text", text: t("line.approval.noPermission", locale) }]
  }

  const admin = getAdminClient()
  const counts = await fetchHrApprovalCounts()

  const [registrations, leaves, otRows, docs, complaints, attendanceRows] =
    await Promise.all([
      admin
        .from("hr_employees")
        .select(`id, name, employee_code, ${BRANCH_VIA_EMPLOYEE}(name)`)
        .or(ONBOARDING_PENDING_OR_FILTER)
        .order("created_at", { ascending: false })
        .limit(LIST_LIMIT),
      admin
        .from("hr_leaves")
        .select("id, type, start_date, end_date, hr_employees!employee_id(name)")
        .eq("approval_status", "pending_hr")
        .order("created_at", { ascending: false })
        .limit(LIST_LIMIT),
      admin
        .from("hr_overtime_requests")
        .select("id, work_date, start_time, end_time, hr_employees!employee_id(name)")
        .eq("approval_status", "pending_hr")
        .order("submitted_at", { ascending: false })
        .limit(LIST_LIMIT),
      admin
        .from("hr_document_requests")
        .select("id, doc_type, status, hr_employees!inner(name)")
        .in("status", ["pending", "on_hold", "processing", "ready"])
        .order("created_at", { ascending: false })
        .limit(LIST_LIMIT),
      admin
        .from("hr_complaints")
        .select("id, ticket_code, subject")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(LIST_LIMIT),
      admin
        .from("hr_attendance")
        .select(
          `id, check_in_at, location_review_flags, ${EMPLOYEE_VIA_ATTENDANCE}!inner(name)`
        )
        .eq("location_review_status", "pending_hr")
        .order("check_in_at", { ascending: false })
        .limit(LIST_LIMIT),
    ])

  const bubbles: messagingApi.FlexBubble[] = []

  const regLines = (registrations.data ?? []).map((row) => {
    const name = row.name as string
    const code = row.employee_code as string | null
    return `• ${name}${code ? ` (${code})` : ""}`
  })
  bubbles.push(
    summaryBubble(
      t("line.pendingQueue.registration", locale),
      counts.registration + counts.onboarding,
      regLines,
      (registrations.data ?? []).slice(0, 1).map((row) =>
        postbackButton({
          label: t("line.approval.approve", locale),
          data: buildApprovalPostbackData(
            "approve_registration",
            "emp_id",
            row.id as string
          ),
          color: BRAND_RED,
        })
      ),
      locale
    )
  )

  const leaveLines = (leaves.data ?? []).map((row) => {
    const emp = Array.isArray(row.hr_employees) ? row.hr_employees[0] : row.hr_employees
    const typeLabel = LEAVE_TYPE_LABELS[row.type as LeaveType] ?? row.type
    return `• ${emp?.name ?? "—"} — ${typeLabel} ${row.start_date}`
  })
  bubbles.push(
    summaryBubble(
      t("line.pendingQueue.leave", locale),
      counts.leaveHr,
      leaveLines,
      (leaves.data ?? []).slice(0, 1).map((row) =>
        postbackButton({
          label: t("line.approval.approve", locale),
          data: buildApprovalPostbackData("approve_leave", "leave_id", row.id as string),
          color: "#2563EB",
        })
      ),
      locale
    )
  )

  const otLines = (otRows.data ?? []).map((row) => {
    const emp = Array.isArray(row.hr_employees) ? row.hr_employees[0] : row.hr_employees
    return `• ${emp?.name ?? "—"} — ${row.work_date} ${row.start_time}-${row.end_time}`
  })
  bubbles.push(
    summaryBubble(
      t("line.pendingQueue.overtime", locale),
      counts.overtime,
      otLines,
      (otRows.data ?? []).slice(0, 1).map((row) =>
        postbackButton({
          label: t("line.approval.approve", locale),
          data: buildApprovalPostbackData("approve_ot", "ot_id", row.id as string),
          color: BRAND_RED,
        })
      ),
      locale
    )
  )

  const docLines = (docs.data ?? []).map((row) => {
    const emp = Array.isArray(row.hr_employees) ? row.hr_employees[0] : row.hr_employees
    const typeLabel = DOC_TYPE_LABELS[row.doc_type as DocType] ?? row.doc_type
    return `• ${emp?.name ?? "—"} — ${typeLabel} (${row.status})`
  })
  bubbles.push(
    summaryBubble(
      t("line.pendingQueue.document", locale),
      counts.document,
      docLines,
      (docs.data ?? []).slice(0, 1).map((row) =>
        postbackButton({
          label: t("line.approval.approve", locale),
          data: buildApprovalPostbackData("approve_document", "doc_id", row.id as string),
          color: "#7B1FA2",
        })
      ),
      locale
    )
  )

  const complaintLines = (complaints.data ?? []).map(
    (row) => `• ${row.ticket_code} — ${row.subject}`
  )
  bubbles.push(
    summaryBubble(
      t("line.pendingQueue.complaint", locale),
      counts.complaint,
      complaintLines,
      null,
      locale
    )
  )

  const attLines = (attendanceRows.data ?? []).map((row) => {
    const emp = Array.isArray(row.hr_employees) ? row.hr_employees[0] : row.hr_employees
    return `• ${emp?.name ?? "—"} — ${String(row.check_in_at).slice(0, 16)}`
  })
  bubbles.push(
    summaryBubble(
      t("line.pendingQueue.attendance", locale),
      counts.attendance,
      attLines,
      (attendanceRows.data ?? []).slice(0, 1).map((row) =>
        postbackButton({
          label: t("line.approval.approve", locale),
          data: buildApprovalPostbackData(
            "approve_attendance",
            "attendance_id",
            row.id as string
          ),
          color: "#059669",
        })
      ),
      locale
    )
  )

  return [
    {
      type: "flex",
      altText: t("line.pendingQueue.alt", locale),
      contents: {
        type: "carousel",
        contents: bubbles,
      },
    },
  ]
}

export function isPendingQueueCommand(text: string): boolean {
  const trimmed = text.trim()
  const lower = trimmed.toLowerCase()
  return (
    lower === "/pending" ||
    trimmed === "เปิดคิวรออนุมัติ" ||
    trimmed === "ดูคิวรออนุมัติ" ||
    lower === "open pending queue"
  )
}

/** @deprecated use isPendingQueueCommand */
export function isPendingSlashCommand(text: string): boolean {
  return isPendingQueueCommand(text)
}
