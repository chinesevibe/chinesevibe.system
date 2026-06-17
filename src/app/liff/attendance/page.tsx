import { getCorrectableDays } from "@/features/attendance/calendar"
import {
  getRetroDeadline,
  getRetroUsage,
  isWithinRetroWindow,
  type ShiftSchedule,
} from "@/lib/attendance/retro-limit"
import { getCurrentEmployee } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { AttendanceManualClient } from "./page-client"

function ictDateNow(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

function ictTimeNow(): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  }).format(new Date())
}

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

export default async function AttendanceLiffPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const employee = await getCurrentEmployee()
  if (!employee) return null

  const raw = await searchParams
  const requestedDate =
    typeof raw.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date)
      ? raw.date
      : ictDateNow()

  const supabase = await createClient()
  const now = new Date()
  const [shift, retroUsage, correctable] = await Promise.all([
    loadShift(employee.id),
    getRetroUsage(supabase, employee.id, now),
    getCorrectableDays(employee.id, now),
  ])

  const withinWindow = isWithinRetroWindow(requestedDate, shift, now)
  const deadline =
    shift && requestedDate !== ictDateNow()
      ? getRetroDeadline(requestedDate, shift, now).toISOString()
      : null

  return (
    <AttendanceManualClient
      defaultDate={requestedDate}
      defaultTime={ictTimeNow()}
      today={ictDateNow()}
      retroUsage={retroUsage}
      withinRetroWindow={withinWindow}
      retroDeadline={deadline}
      correctableDays={correctable}
    />
  )
}
