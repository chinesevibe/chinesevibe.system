import { NextResponse, type NextRequest } from "next/server"

import {
  DOC_STATUSES,
  resolveDocumentDecisionStatus,
  type DocDecisionAction,
  type DocStatus,
} from "@/features/documents/types"
import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { coerceLocale } from "@/lib/i18n/types"
import { documentStatusFlex } from "@/lib/line/flex/document-request"
import { pushToLineUser } from "@/lib/line/notify-hr"
import { createClient } from "@/lib/supabase/server"

type DecideBody = {
  action?: DocDecisionAction
  status?: DocStatus
  note?: string
}

const ACTIONS: DocDecisionAction[] = ["hold", "approve", "reject"]

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await context.params
  let body: DecideBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  let nextStatus: DocStatus | undefined
  if (body.action && ACTIONS.includes(body.action)) {
    const supabase = await createClient()
    const { data: current } = await supabase
      .from("hr_document_requests")
      .select("status")
      .eq("id", id)
      .maybeSingle()
    if (!current) {
      return NextResponse.json({ error: "not found" }, { status: 404 })
    }
    nextStatus = resolveDocumentDecisionStatus(
      current.status as DocStatus,
      body.action
    )
  } else if (body.status && DOC_STATUSES.includes(body.status)) {
    nextStatus = body.status
  }

  if (!nextStatus) {
    return NextResponse.json({ error: "invalid action or status" }, { status: 400 })
  }

  const note = typeof body.note === "string" ? body.note.trim() : ""
  if (body.action === "reject" && note.length < 3) {
    return NextResponse.json({ error: "reject reason required" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: doc, error: fetchError } = await supabase
    .from("hr_document_requests")
    .select(
      "id, doc_type, copies, status, hr_employees(line_user_id, name, preferred_locale)"
    )
    .eq("id", id)
    .maybeSingle()

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }
  if (!doc) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  const { error: updateError } = await supabase
    .from("hr_document_requests")
    .update({ status: nextStatus, hr_note: note || null })
    .eq("id", id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  type EmpJoin = {
    line_user_id: string | null
    name: string
    preferred_locale?: unknown
  }
  const empRaw = doc.hr_employees as EmpJoin | EmpJoin[]
  const emp = Array.isArray(empRaw) ? empRaw[0] : empRaw
  const locale = coerceLocale(emp?.preferred_locale)

  try {
    if (emp?.line_user_id) {
      await pushToLineUser(emp.line_user_id, [
        documentStatusFlex({
          docType: doc.doc_type,
          status: nextStatus,
          note: note || undefined,
          locale,
        }),
      ])
    }
  } catch (lineError) {
    console.error("document decide LINE notify failed:", lineError)
  }

  return NextResponse.json({ id, status: nextStatus })
}
