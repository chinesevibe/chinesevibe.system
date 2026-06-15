import { NextResponse, type NextRequest } from "next/server"

import { DOC_TYPES, type DocType } from "@/features/documents/types"
import { getCurrentEmployee } from "@/lib/auth/session"
import {
  documentSubmitConfirmFlex,
  documentSubmitHrNotifyFlex,
} from "@/lib/line/flex/document-request"
import { notifyHr, pushToLineUser } from "@/lib/line/notify-hr"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const employee = await getCurrentEmployee()
  if (!employee || employee.status !== "active") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  let body: {
    docType?: string
    copies?: number
    purpose?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const docType = body.docType
  const copies = body.copies ?? 1
  const purpose = typeof body.purpose === "string" ? body.purpose.trim() : ""

  if (
    typeof docType !== "string" ||
    !DOC_TYPES.includes(docType as DocType) ||
    purpose.length < 5 ||
    copies < 1 ||
    copies > 10
  ) {
    return NextResponse.json({ error: "invalid fields" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from("hr_document_requests")
    .insert({
      employee_id: employee.id,
      doc_type: docType,
      copies,
      purpose,
      status: "pending",
    })
    .select("id")
    .single()

  if (error || !row) {
    return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 })
  }

  try {
    if (employee.line_user_id) {
      await pushToLineUser(employee.line_user_id, [
        documentSubmitConfirmFlex({
          employeeName: employee.name,
          docType: docType as DocType,
          copies,
          locale: employee.preferred_locale,
        }),
      ])
    }
    await notifyHr([
      documentSubmitHrNotifyFlex({
        employeeName: employee.name,
        department: employee.department,
        docType: docType as DocType,
        copies,
        purpose,
        locale: employee.preferred_locale,
      }),
    ])
  } catch (lineError) {
    console.error("document request LINE notify failed:", lineError)
  }

  return NextResponse.json({ id: row.id, status: "pending" })
}
