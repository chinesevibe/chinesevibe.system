import { NextRequest, NextResponse } from "next/server"
import { getAdminClient } from "@/lib/auth/admin-client"

/** GET /api/payroll/advances — list all salary advances */
export async function GET(_req: NextRequest) {
  const admin = getAdminClient()

  const { data, error } = await admin
    .from("hr_salary_advances")
    .select(
      `id, employee_id, amount, advance_date, deduct_period, note, status, created_at,
       hr_employees!inner(name, employee_code)`
    )
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ advances: data ?? [] })
}

/** POST /api/payroll/advances — create a new salary advance */
export async function POST(req: NextRequest) {
  const admin = getAdminClient()

  const body = await req.json()
  const { employee_id, amount, deduct_period, note } = body as {
    employee_id?: string
    amount?: number
    deduct_period?: string
    note?: string
  }

  if (!employee_id || typeof amount !== "number" || !deduct_period) {
    return NextResponse.json(
      { error: "employee_id, amount และ deduct_period จำเป็นต้องระบุ" },
      { status: 400 }
    )
  }

  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await admin
    .from("hr_salary_advances")
    .insert({
      employee_id,
      amount: Math.round(amount * 100) / 100,
      advance_date: today,
      deduct_period,
      note: note ?? null,
      status: "pending",
    })
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
