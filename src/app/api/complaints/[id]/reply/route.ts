import { NextResponse, type NextRequest } from "next/server"

import { buildComplaintThread } from "@/features/complaints/thread"
import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { coerceLocale } from "@/lib/i18n/types"
import { t } from "@/lib/i18n/translate"
import { notifyComplaintReplyToEmployee } from "@/lib/line/complaint-notify"
import { createClient } from "@/lib/supabase/server"

type ReplyBody = {
  message?: string
  close?: boolean
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await context.params
  let body: ReplyBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const rawMessage = typeof body.message === "string" ? body.message.trim() : ""
  const supabase = await createClient()
  const { data: complaint, error: fetchError } = await supabase
    .from("hr_complaints")
    .select(
      "id, ticket_code, subject, body, created_at, is_anonymous, status, employee_id, hr_employees!employee_id(name, preferred_locale)"
    )
    .eq("id", id)
    .maybeSingle()

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }
  if (!complaint) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
  if (complaint.status === "closed") {
    return NextResponse.json({ error: "case_closed" }, { status: 400 })
  }

  type EmpJoin = { name?: string; preferred_locale?: unknown }
  const empRaw = complaint.hr_employees as EmpJoin | EmpJoin[] | null
  const emp = empRaw ? (Array.isArray(empRaw) ? empRaw[0] : empRaw) : null
  const locale = coerceLocale(emp?.preferred_locale)
  const message =
    rawMessage.length >= 3
      ? rawMessage
      : body.close
        ? t("line.complaintReply.defaultCloseMessage", locale)
        : ""
  if (message.length < 3) {
    return NextResponse.json({ error: "message required" }, { status: 400 })
  }

  const { error: replyError } = await supabase.from("hr_complaint_replies").insert({
    complaint_id: id,
    author_employee_id: caller.id,
    message,
  })

  if (replyError) {
    return NextResponse.json({ error: replyError.message }, { status: 500 })
  }

  const newStatus = body.close ? "closed" : "replied"
  const { error: updateError } = await supabase
    .from("hr_complaints")
    .update({ status: newStatus })
    .eq("id", id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  const { data: replyRows, error: repliesError } = await supabase
    .from("hr_complaint_replies")
    .select(
      "message, created_at, hr_employees!author_employee_id(name)"
    )
    .eq("complaint_id", id)
    .order("created_at", { ascending: true })

  if (repliesError) {
    return NextResponse.json({ error: repliesError.message }, { status: 500 })
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
      authorName: author?.name ?? caller.name,
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
    closed: body.close === true,
    thread,
  })

  return NextResponse.json({
    id,
    status: newStatus,
    lineNotified: lineNotify.sent,
    lineNotifyReason: lineNotify.sent ? null : lineNotify.reason,
    replyCount: replies.length,
  })
}
