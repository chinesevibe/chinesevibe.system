import { NextResponse } from "next/server"

import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  let body: { employeeId: string; date: string; type?: string; note?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 })
  }

  const { employeeId, date, type = "day_off", note } = body
  if (!employeeId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "invalid_fields" }, { status: 422 })
  }
  if (type !== "day_off" && type !== "public_holiday") {
    return NextResponse.json({ error: "invalid_type" }, { status: 422 })
  }

  const supabase = await createClient()
  const { error } = await supabase.from("hr_employee_date_overrides").upsert(
    { employee_id: employeeId, date, type, note: note ?? null, created_by: caller.id },
    { onConflict: "employee_id,date" }
  )

  if (error) {
    console.error("date-override POST error", error)
    return NextResponse.json({ error: "db_error" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  let body: { employeeId: string; date: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 })
  }

  const { employeeId, date } = body
  if (!employeeId || !date) {
    return NextResponse.json({ error: "invalid_fields" }, { status: 422 })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("hr_employee_date_overrides")
    .delete()
    .eq("employee_id", employeeId)
    .eq("date", date)

  if (error) {
    console.error("date-override DELETE error", error)
    return NextResponse.json({ error: "db_error" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
