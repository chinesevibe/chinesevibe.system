import {
  DOC_STATUSES,
  DOC_STATUS_LABELS,
  DOC_TYPE_LABELS,
  resolveDocumentDecisionStatus,
  type DocDecisionAction,
  type DocStatus,
  type DocType,
} from "@/features/documents/types"
import { getAdminClient } from "@/lib/auth/admin-client"
import { coerceLocale } from "@/lib/i18n/types"
import { documentStatusFlex } from "@/lib/line/flex/document-request"
import {
  getApproverDisplayName,
  notifyDecisionParties,
} from "@/lib/line/notify-approval-decision"

export type DocumentDecideInput = {
  docId: string
  approverId: string
  action: DocDecisionAction
  note?: string
}

export type DocumentDecideResult =
  | { ok: true; status: DocStatus; id: string }
  | { ok: false; error: string; status: 400 | 404 | 409 }

const ACTIONS: DocDecisionAction[] = ["hold", "approve", "reject"]

export async function decideDocument(
  input: DocumentDecideInput
): Promise<DocumentDecideResult> {
  if (!ACTIONS.includes(input.action)) {
    return { ok: false, error: "invalid action", status: 400 }
  }

  const note = (input.note ?? "").trim()
  if (input.action === "reject" && note.length < 3) {
    return { ok: false, error: "reject reason required", status: 400 }
  }

  const admin = getAdminClient()
  const { data: doc, error: fetchError } = await admin
    .from("hr_document_requests")
    .select(
      "id, doc_type, copies, status, hr_employees(line_user_id, name, preferred_locale)"
    )
    .eq("id", input.docId)
    .maybeSingle()

  if (fetchError) {
    return { ok: false, error: fetchError.message, status: 400 }
  }
  if (!doc) {
    return { ok: false, error: "not found", status: 404 }
  }

  const currentStatus = doc.status as DocStatus
  const nextStatus = resolveDocumentDecisionStatus(currentStatus, input.action)

  if (nextStatus === currentStatus && input.action !== "reject") {
    return { ok: false, error: "already decided", status: 409 }
  }

  if (input.action === "reject" && currentStatus === "rejected") {
    return { ok: false, error: "already decided", status: 409 }
  }

  if (
    input.action === "approve" &&
    !["pending", "on_hold", "processing", "ready"].includes(currentStatus)
  ) {
    return { ok: false, error: "already decided", status: 409 }
  }

  const { error: updateError } = await admin
    .from("hr_document_requests")
    .update({ status: nextStatus, hr_note: note || null })
    .eq("id", input.docId)

  if (updateError) {
    return { ok: false, error: updateError.message, status: 400 }
  }

  type EmpJoin = {
    line_user_id: string | null
    name: string
    preferred_locale?: unknown
  }
  const empRaw = doc.hr_employees as EmpJoin | EmpJoin[]
  const emp = Array.isArray(empRaw) ? empRaw[0] : empRaw
  const locale = coerceLocale(emp?.preferred_locale)
  const employeeName = emp?.name ?? "พนักงาน"
  const docType = doc.doc_type as DocType
  const docLabel = DOC_TYPE_LABELS[docType] ?? doc.doc_type
  const statusLabel = DOC_STATUS_LABELS[nextStatus] ?? nextStatus
  const approverName = await getApproverDisplayName(input.approverId)

  const hrHeadline =
    input.action === "reject"
      ? "❌ ปฏิเสธคำขอเอกสาร"
      : `✅ อัปเดตคำขอเอกสาร → ${statusLabel}`

  await notifyDecisionParties({
    employeeLineUserId: emp?.line_user_id,
    employeeMessages: emp?.line_user_id
      ? [
          documentStatusFlex({
            docType: doc.doc_type,
            status: nextStatus,
            note: note || undefined,
            locale,
          }),
        ]
      : undefined,
    hrGroupText: [
      hrHeadline,
      `พนักงาน: ${employeeName}`,
      `เอกสาร: ${docLabel}`,
      `สำเนา: ${doc.copies}`,
      note ? `หมายเหตุ: ${note}` : null,
      `โดย: ${approverName}`,
    ]
      .filter(Boolean)
      .join("\n"),
  })

  return { ok: true, status: nextStatus, id: input.docId }
}

export function resolveDocumentStatusFromBody(body: {
  action?: DocDecisionAction
  status?: DocStatus
}): DocStatus | undefined {
  if (body.action && ACTIONS.includes(body.action)) {
    return undefined
  }
  if (body.status && DOC_STATUSES.includes(body.status)) {
    return body.status
  }
  return undefined
}
