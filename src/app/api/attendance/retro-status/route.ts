import { NextResponse } from "next/server"

import { getCorrectableDays } from "@/features/attendance/calendar"
import {
  getRetroDeadline,
  getRetroUsage,
  isWithinRetroWindow,
} from "@/lib/attendance/retro-limit"
import { profileScheduleFromTimes } from "@/lib/attendance/profile-schedule"
import { getCurrentEmployee } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

async function loadProfileSchedule(employeeId: string) {
  const supabase = await createClient()
  const { data: employee } = await supabase
    .from("hr_employees")
    .select("default_check_in_time, default_check_out_time")
    .eq("id", employeeId)
    .maybeSingle()
  return profileScheduleFromTimes(
    (employee?.default_check_in_time as string | null) ?? null,
    (employee?.default_check_out_time as string | null) ?? null
  )
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
    loadProfileSchedule(employee.id),
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
