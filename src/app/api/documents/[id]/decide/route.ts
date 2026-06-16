import { NextResponse, type NextRequest } from "next/server"

import {
  DOC_STATUSES,
  resolveDocumentDecisionStatus,
  type DocDecisionAction,
  type DocStatus,
} from "@/features/documents/types"
import { decideDocument } from "@/lib/approval/document-decide"
import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
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

  let action: DocDecisionAction | undefined
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
    const nextStatus = resolveDocumentDecisionStatus(
      current.status as DocStatus,
      body.action
    )
    if (!DOC_STATUSES.includes(nextStatus)) {
      return NextResponse.json({ error: "invalid action or status" }, { status: 400 })
    }
    action = body.action
  } else if (body.status && DOC_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "invalid action or status" }, { status: 400 })
  }

  if (!action) {
    return NextResponse.json({ error: "invalid action or status" }, { status: 400 })
  }

  const result = await decideDocument({
    docId: id,
    action,
    approverId: caller.id,
    note: body.note,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ id: result.id, status: result.status })
}
