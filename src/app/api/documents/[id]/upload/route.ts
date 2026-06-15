import { NextResponse, type NextRequest } from "next/server"

import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { coerceLocale } from "@/lib/i18n/types"
import { t } from "@/lib/i18n/translate"
import { documentStatusFlex } from "@/lib/line/flex/document-request"
import { pushToLineUser } from "@/lib/line/notify-hr"
import { createClient } from "@/lib/supabase/server"

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = ["application/pdf", "image/jpeg", "image/png"]

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await context.params
  const form = await request.formData()
  const file = form.get("file")

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "file required" }, { status: 400 })
  }
  if (!ALLOWED.includes(file.type) || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "invalid file" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: doc, error: fetchError } = await supabase
    .from("hr_document_requests")
    .select("id, doc_type, employee_id, hr_employees(line_user_id, preferred_locale)")
    .eq("id", id)
    .maybeSingle()

  if (fetchError || !doc) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  const path = `results/${id}/${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`
  const { error: uploadError } = await supabase.storage
    .from("hr-documents")
    .upload(path, file, { contentType: file.type, upsert: true })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("hr-documents")
    .createSignedUrl(path, 60 * 60 * 24 * 7)

  if (signError || !signed?.signedUrl) {
    return NextResponse.json({ error: signError?.message ?? "sign failed" }, { status: 500 })
  }

  await supabase
    .from("hr_document_requests")
    .update({ result_file_url: path, status: "ready" })
    .eq("id", id)

  type Emp = { line_user_id: string | null; preferred_locale?: unknown }
  const empRaw = doc.hr_employees as Emp | Emp[]
  const emp = Array.isArray(empRaw) ? empRaw[0] : empRaw
  const locale = coerceLocale(emp?.preferred_locale)

  try {
    if (emp?.line_user_id) {
      await pushToLineUser(emp.line_user_id, [
        documentStatusFlex({
          docType: doc.doc_type as string,
          status: "ready",
          note: t("line.docStatus.downloadNote", locale, { url: signed.signedUrl }),
          locale,
        }),
      ])
    }
  } catch (e) {
    console.error("document upload notify failed:", e)
  }

  return NextResponse.json({ path, signedUrl: signed.signedUrl, status: "ready" })
}
