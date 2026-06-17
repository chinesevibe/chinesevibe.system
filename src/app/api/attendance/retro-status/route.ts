import { NextResponse } from "next/server"

import { getCorrectableDays } from "@/features/attendance/calendar"
import {
  getRetroDeadline,
  getRetroUsage,
  isWithinRetroWindow,
  type ShiftSchedule,
} from "@/lib/attendance/retro-limit"
import { getCurrentEmployee } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

async function loadShift(employeeId: string): Promise<ShiftSchedule | null> {
  const supabase = await createClient()
  const { data: employee } = await supabase
    .from("hr_employees")
    .select("work_shift_id")
    .eq("id", employeeId)
    .maybeSingle()
  if (!employee?.work_shift_id) return null

  const { data: shift } = await supabase
    .from("hr_work_shifts")
    .select(
      "start_hour, start_minute, end_hour, end_minute, crosses_midnight, grace_minutes"
    )
    .eq("id", employee.work_shift_id)
    .eq("is_active", true)
    .maybeSingle()
  return (shift as ShiftSchedule | null) ?? null
}

export async function GET(request: Request) {
  const employee = await getCurrentEmployee()
  if (!employee || employee.status !== "active") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const date = url.searchParams.get("date")
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 })
  }

  const supabase = await createClient()
  const now = new Date()
  const [shift, retroUsage, correctable] = await Promise.all([
    loadShift(employee.id),
    getRetroUsage(supabase, employee.id, now),
    getCorrectableDays(employee.id, now),
  ])

  const withinRetroWindow = isWithinRetroWindow(date, shift, now)
  const deadline = shift ? getRetroDeadline(date, shift, now).toISOString() : null

  return NextResponse.json({
    date,
    withinRetroWindow,
    deadline,
    retroUsage,
    correctableDays: correctable,
  })
}
