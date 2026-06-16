import { buildComplaintThread } from "@/features/complaints/thread"
import { getAdminClient } from "@/lib/auth/admin-client"
import { coerceLocale } from "@/lib/i18n/types"
import { t } from "@/lib/i18n/translate"
import { notifyComplaintReplyToEmployee } from "@/lib/line/complaint-notify"
import {
  getApproverDisplayName,
  notifyDecisionParties,
} from "@/lib/line/notify-approval-decision"

export type ComplaintReplyInput = {
  complaintId: string
  approverId: string
  approverName: string
  message?: string
  close?: boolean
}

export type ComplaintReplyResult =
  | {
      ok: true
      id: string
      status: "replied" | "closed"
      lineNotified: boolean
      lineNotifyReason: string | null
      replyCount: number
    }
  | { ok: false; error: string; status: 400 | 404 | 409 }

export async function replyComplaint(
  input: ComplaintReplyInput
): Promise<ComplaintReplyResult> {
  const rawMessage = (input.message ?? "").trim()
  const admin = getAdminClient()

  const { data: complaint, error: fetchError } = await admin
    .from("hr_complaints")
    .select(
      "id, ticket_code, subject, body, created_at, is_anonymous, status, employee_id, hr_employees!employee_id(name, preferred_locale)"
    )
    .eq("id", input.complaintId)
    .maybeSingle()

  if (fetchError) {
    return { ok: false, error: fetchError.message, status: 400 }
  }
  if (!complaint) {
    return { ok: false, error: "not found", status: 404 }
  }
  if (complaint.status === "closed") {
    return { ok: false, error: "case_closed", status: 409 }
  }

  type EmpJoin = { name?: string; preferred_locale?: unknown }
  const empRaw = complaint.hr_employees as EmpJoin | EmpJoin[] | null
  const emp = empRaw ? (Array.isArray(empRaw) ? empRaw[0] : empRaw) : null
  const locale = coerceLocale(emp?.preferred_locale)
  const message =
    rawMessage.length >= 3
      ? rawMessage
      : input.close
        ? t("line.complaintReply.defaultCloseMessage", locale)
        : ""

  if (message.length < 3) {
    return { ok: false, error: "message required", status: 400 }
  }

  const { error: replyError } = await admin.from("hr_complaint_replies").insert({
    complaint_id: input.complaintId,
    author_employee_id: input.approverId,
    message,
  })

  if (replyError) {
    return { ok: false, error: replyError.message, status: 400 }
  }

  const newStatus = input.close ? "closed" : "replied"
  const { error: updateError } = await admin
    .from("hr_complaints")
    .update({ status: newStatus })
    .eq("id", input.complaintId)

  if (updateError) {
    return { ok: false, error: updateError.message, status: 400 }
  }

  const { data: replyRows, error: repliesError } = await admin
    .from("hr_complaint_replies")
    .select("message, created_at, hr_employees!author_employee_id(name)")
    .eq("complaint_id", input.complaintId)
    .order("created_at", { ascending: true })

  if (repliesError) {
    return { ok: false, error: repliesError.message, status: 400 }
  }

  type ReplyJoin = {
    message: string
    created_at: string
    hr_employees: { name: string } | Array<{ name: string }> | null
  }

  const replies = ((replyRows ?? []) as ReplyJoin[]).map((row) => {
    const author = row.hr_employees
      ? Array.isArray(row.hr_employees)
        ? row.hr_employees[0]
        : row.hr_employees
      : null
    return {
      message: row.message,
      createdAt: row.created_at,
      authorName: author?.name ?? input.approverName,
    }
  })

  const thread = buildComplaintThread({
    body: complaint.body,
    createdAt: complaint.created_at,
    employeeName: complaint.is_anonymous ? null : (emp?.name ?? null),
    replies,
  })

  const lineNotify = await notifyComplaintReplyToEmployee({
    employeeId: complaint.employee_id,
    isAnonymous: complaint.is_anonymous,
    ticketCode: complaint.ticket_code,
    subject: complaint.subject,
    message,
    closed: input.close === true,
    thread,
  })

  const approverName = await getApproverDisplayName(input.approverId)
  const employeeLabel = complaint.is_anonymous
    ? "ผู้ร้องเรียน (ไม่ระบุตัวตน)"
    : (emp?.name ?? "พนักงาน")

  await notifyDecisionParties({
    hrGroupText: [
      input.close ? "✅ ปิดเรื่องร้องเรียนแล้ว" : "✅ ตอบกลับร้องเรียนแล้ว",
      `เลขที่: ${complaint.ticket_code}`,
      `เรื่อง: ${complaint.subject}`,
      `จาก: ${employeeLabel}`,
      `ข้อความ HR: ${message}`,
      `โดย: ${approverName}`,
    ].join("\n"),
  })

  return {
    ok: true,
    id: input.complaintId,
    status: newStatus,
    lineNotified: lineNotify.sent,
    lineNotifyReason: lineNotify.sent ? null : lineNotify.reason,
    replyCount: replies.length,
  }
}
