import { NextRequest, NextResponse } from "next/server"
import { getAdminClient } from "@/lib/auth/admin-client"

type Params = { params: Promise<{ id: string }> }

/** PATCH /api/payroll/advances/[id] — cancel a pending advance */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const admin = getAdminClient()

  // Guard: only pending can be cancelled
  const { data: existing } = await admin
    .from("hr_salary_advances")
    .select("id, status")
    .eq("id", id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 })
  }
  if (existing.status !== "pending") {
    return NextResponse.json(
      { error: "ยกเลิกได้เฉพาะรายการที่ยังรอดำเนินการ (pending) เท่านั้น" },
      { status: 400 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const status = (body as { status?: string }).status ?? "cancelled"

  if (status !== "cancelled") {
    return NextResponse.json({ error: "รองรับเฉพาะการยกเลิก" }, { status: 400 })
  }

  const { data, error } = await admin
    .from("hr_salary_advances")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(
      `id, employee_id, amount, advance_date, deduct_period, note, status, created_at,
       hr_employees!inner(name, employee_code)`
    )
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ advance: data })
}
