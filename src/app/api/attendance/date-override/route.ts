import { NextResponse } from "next/server"

import { getAdminClient } from "@/lib/auth/admin-client"
import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { recordPayrollHours } from "@/lib/approval/payroll-ledger"
import { createClient } from "@/lib/supabase/server"

/** 12 paid hours credited for every HR-set day-off / public holiday */
const PAID_DAY_OFF_HOURS = 12

function dateOverrideSourceId(employeeId: string, date: string) {
  return `${employeeId}_${date}`
}

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

  // Fetch employee branch for payroll period bucketing
  const { data: emp } = await supabase
    .from("hr_employees")
    .select("branch_id")
    .eq("id", employeeId)
    .maybeSingle()

  // Record 12 paid hours — upsert is idempotent via source_type+source_id
  await recordPayrollHours({
    employeeId,
    branchId: (emp?.branch_id as string | null) ?? null,
    workDate: date,
    hours: PAID_DAY_OFF_HOURS,
    lineType: "paid_day_off",
    sourceType: "date_override",
    sourceId: dateOverrideSourceId(employeeId, date),
  })

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

  // Remove the corresponding payroll hour line
  const admin = getAdminClient()
  await admin
    .from("hr_payroll_hour_lines")
    .delete()
    .eq("source_type", "date_override")
    .eq("source_id", dateOverrideSourceId(employeeId, date))

  return NextResponse.json({ ok: true })
}
