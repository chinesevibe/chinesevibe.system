// GET /api/admin/shifts  — list all shifts (dev only)
// POST /api/admin/shifts — create a new shift (dev only)
import { NextResponse, type NextRequest } from "next/server"

import { getAdminClient } from "@/lib/auth/admin-client"
import { isDev } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"

type ShiftBody = {
  code: string
  name: string
  start_hour: number
  start_minute: number
  end_hour: number
  end_minute: number
  crosses_midnight: boolean
  grace_minutes: number
  check_in_early_minutes: number
  standard_hours: number
}

export async function GET() {
  const caller = await getCurrentEmployee()
  if (!caller || !isDev(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const admin = getAdminClient()
  const { data, error } = await admin
    .from("hr_work_shifts")
    .select(
      "id, code, name, start_hour, start_minute, end_hour, end_minute, crosses_midnight, grace_minutes, check_in_early_minutes, standard_hours, is_active, created_at"
    )
    .order("start_hour")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const caller = await getCurrentEmployee()
  if (!caller || !isDev(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const body = (await req.json()) as Partial<ShiftBody>
  const { code, name, start_hour, start_minute, end_hour, end_minute } = body

  if (!code || !name || start_hour == null || start_minute == null || end_hour == null || end_minute == null) {
    return NextResponse.json({ error: "code, name, start_hour, start_minute, end_hour, end_minute required" }, { status: 400 })
  }

  const admin = getAdminClient()
  const { data, error } = await admin
    .from("hr_work_shifts")
    .insert({
      code: code.toUpperCase().trim(),
      name: name.trim(),
      start_hour,
      start_minute: start_minute ?? 0,
      end_hour,
      end_minute: end_minute ?? 0,
      crosses_midnight: body.crosses_midnight ?? false,
      grace_minutes: body.grace_minutes ?? 10,
      check_in_early_minutes: body.check_in_early_minutes ?? 60,
      standard_hours: body.standard_hours ?? 8,
      is_active: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
