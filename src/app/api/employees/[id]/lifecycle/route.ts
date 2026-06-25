import { NextResponse, type NextRequest } from "next/server"

import { canManageHr } from "@/lib/auth/roles"
import { getAdminClient } from "@/lib/auth/admin-client"
import { getCurrentEmployee } from "@/lib/auth/session"
import { isAllowedComplianceAttachment } from "@/lib/employees/compliance-attachment"
import {
  deleteComplianceAttachment,
  uploadComplianceAttachment,
} from "@/lib/employees/upload-compliance-attachment"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await context.params
  const contentType = request.headers.get("content-type") ?? ""
  let body: {
    action?: string
    outcome?: string
    note?: string
    reason?: string
    extendedUntil?: string
    visaExpiry?: string | null
    workPermitExpiry?: string | null
    contractEnd?: string | null
  }
  let formData: FormData | null = null

  if (contentType.includes("multipart/form-data")) {
    formData = await request.formData()
    body = {
      action: String(formData.get("action") ?? ""),
      note: String(formData.get("note") ?? ""),
      visaExpiry: (formData.get("visaExpiry") as string | null) || null,
      workPermitExpiry: (formData.get("workPermitExpiry") as string | null) || null,
      contractEnd: (formData.get("contractEnd") as string | null) || null,
    }
  } else {
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "invalid body" }, { status: 400 })
    }
  }

  const supabase = getAdminClient()

  if (body.action === "probation") {
    const outcome = body.outcome
    if (!outcome || !["passed", "failed", "extended", "in_progress"].includes(outcome)) {
      return NextResponse.json({ error: "invalid outcome" }, { status: 400 })
    }

    const patch: Record<string, string | null> = {
      probation_outcome: outcome,
      probation_outcome_note: body.note?.trim() || null,
    }
    if (outcome === "extended" && body.extendedUntil) {
      patch.probation_extended_until = body.extendedUntil
      patch.probation_end = body.extendedUntil
    }
    if (outcome === "passed") {
      patch.probation_end = null
    }

    const { error } = await supabase.from("hr_employees").update(patch).eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (body.note?.trim()) {
      await supabase.from("hr_compliance_notes").insert({
        employee_id: id,
        category: "probation",
        note: body.note.trim(),
        created_by: caller.id,
      })
    }

    return NextResponse.json({ ok: true })
  }

  if (body.action === "renewal") {
    const nextCategory =
      body.visaExpiry ? "visa" : body.workPermitExpiry ? "work_permit" : body.contractEnd ? "contract" : null
    if (!nextCategory) {
      return NextResponse.json({ error: "ต้องเลือกประเภทเอกสารที่จะต่อ" }, { status: 400 })
    }

    let attachmentFile: File | null = null
    if (formData) {
      const maybeFile = formData.get("attachment")
      attachmentFile = maybeFile instanceof File && maybeFile.size > 0 ? maybeFile : null
      if (attachmentFile && !isAllowedComplianceAttachment(attachmentFile)) {
        return NextResponse.json(
          { error: "ไฟล์หลักฐานต้องเป็น JPEG, PNG หรือ WEBP ไม่เกิน 5 MB" },
          { status: 400 }
        )
      }
    }

    const updates: Record<string, string | null> = {}
    if (body.visaExpiry !== undefined && body.visaExpiry !== null) {
      updates.visa_expiry = body.visaExpiry || null
    }
    if (body.workPermitExpiry !== undefined && body.workPermitExpiry !== null) {
      updates.work_permit_expiry = body.workPermitExpiry || null
    }
    if (body.contractEnd !== undefined && body.contractEnd !== null) {
      updates.contract_end = body.contractEnd || null
    }

    const { error } = await supabase
      .from("hr_employees")
      .update(updates)
      .eq("id", id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    let attachmentPath: string | null = null
    if (attachmentFile) {
      try {
        attachmentPath = await uploadComplianceAttachment(
          supabase,
          id,
          nextCategory,
          attachmentFile
        )
      } catch (uploadError) {
        const message =
          uploadError instanceof Error ? uploadError.message : "อัปโหลดหลักฐานไม่สำเร็จ"
        return NextResponse.json({ error: message }, { status: 500 })
      }
    }

    const trimmedNote = body.note?.trim() || null
    const uploadedAt = attachmentPath ? new Date().toISOString() : null
    const { error: noteError } = await supabase.from("hr_compliance_notes").insert({
        employee_id: id,
        category: nextCategory,
        note:
          trimmedNote ??
          `บันทึกการต่อ${nextCategory === "visa" ? "วีซ่า" : nextCategory === "work_permit" ? " Work Permit" : "สัญญา"}`,
        created_by: caller.id,
        attachment_file_path: attachmentPath,
        attachment_file_name: attachmentFile?.name ?? null,
        attachment_uploaded_at: uploadedAt,
      })

    if (noteError) {
      await deleteComplianceAttachment(supabase, attachmentPath).catch(() => undefined)
      return NextResponse.json({ error: noteError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  if (body.action === "leave_blacklist") {
    const reason = (body.reason ?? body.note)?.trim() ?? ""
    if (reason.length < 3) {
      return NextResponse.json({ error: "กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร" }, { status: 400 })
    }

    const now = new Date().toISOString()
    const { error } = await supabase
      .from("hr_employees")
      .update({
        status: "inactive",
        leave_blacklisted: true,
        leave_blacklist_reason: reason,
        leave_blacklisted_at: now,
      })
      .eq("id", id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase.from("hr_compliance_notes").insert({
      employee_id: id,
      category: "blacklist",
      note: reason,
      created_by: caller.id,
    })

    return NextResponse.json({ ok: true })
  }

  if (body.action === "clear_blacklist") {
    const { error } = await supabase
      .from("hr_employees")
      .update({
        leave_blacklisted: false,
        leave_blacklist_reason: null,
        leave_blacklisted_at: null,
      })
      .eq("id", id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase.from("hr_compliance_notes").insert({
      employee_id: id,
      category: "blacklist",
      note: "ยกเลิก Leave Blacklist",
      created_by: caller.id,
    })

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 })
}
