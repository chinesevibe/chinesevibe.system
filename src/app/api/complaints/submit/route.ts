import { NextResponse, type NextRequest } from "next/server"

import { getCurrentEmployee } from "@/lib/auth/session"
import {
  complaintSubmitConfirmFlex,
  complaintSubmitHrNotifyFlex,
} from "@/lib/line/flex/complaint-submit"
import { notifyHr, pushToLineUser } from "@/lib/line/notify-hr"
import { createClient } from "@/lib/supabase/server"

function makeTicketCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = "HR-"
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function POST(request: NextRequest) {
  const employee = await getCurrentEmployee()
  if (!employee || employee.status !== "active") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  let body: {
    subject?: string
    body?: string
    isAnonymous?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const subject = typeof body.subject === "string" ? body.subject.trim() : ""
  const text = typeof body.body === "string" ? body.body.trim() : ""
  const isAnonymous = Boolean(body.isAnonymous)

  if (subject.length < 3 || text.length < 10) {
    return NextResponse.json({ error: "invalid fields" }, { status: 400 })
  }

  const ticketCode = makeTicketCode()
  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from("hr_complaints")
    .insert({
      employee_id: isAnonymous ? null : employee.id,
      ticket_code: ticketCode,
      subject,
      body: text,
      is_anonymous: isAnonymous,
      status: "open",
    })
    .select("id, ticket_code")
    .single()

  if (error || !row) {
    return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 })
  }

  try {
    if (employee.line_user_id) {
      await pushToLineUser(employee.line_user_id, [
        complaintSubmitConfirmFlex({
          ticketCode,
          isAnonymous,
          locale: employee.preferred_locale,
        }),
      ])
    }
    await notifyHr([
      complaintSubmitHrNotifyFlex({
        complaintId: row.id,
        ticketCode,
        subject,
        isAnonymous,
        employeeName: isAnonymous ? undefined : employee.name,
        locale: employee.preferred_locale,
      }),
    ])
  } catch (lineError) {
    console.error("complaint submit LINE notify failed:", lineError)
  }

  return NextResponse.json({
    id: row.id,
    ticketCode: row.ticket_code,
    status: "open",
  })
}
