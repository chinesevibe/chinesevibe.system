import { NextResponse, type NextRequest } from "next/server"

import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await context.params
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
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const supabase = await createClient()

  if (body.action === "probation") {
    const outcome = body.outcome
    if (!outcome || !["passed", "failed", "extended"].includes(outcome)) {
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
    const { error } = await supabase
      .from("hr_employees")
      .update({
        visa_expiry: body.visaExpiry || null,
        work_permit_expiry: body.workPermitExpiry || null,
        contract_end: body.contractEnd || null,
      })
      .eq("id", id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (body.note?.trim()) {
      await supabase.from("hr_compliance_notes").insert({
        employee_id: id,
        category: "visa",
        note: body.note.trim(),
        created_by: caller.id,
      })
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
