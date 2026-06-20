import { getCorrectableDays } from "@/features/attendance/calendar"
import {
  getRetroDeadline,
  getRetroUsage,
  isWithinRetroWindow,
} from "@/lib/attendance/retro-limit"
import { autoCloseOpenAttendanceSessions } from "@/lib/attendance/session-cycle"
import { profileScheduleFromTimes } from "@/lib/attendance/profile-schedule"
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

async function loadProfileSchedule(employeeId: string) {
  const supabase = await createClient()
  const { data: employee } = await supabase
    .from("hr_employees")
    .select("default_check_in_time, default_check_out_time")
    .eq("id", employeeId)
    .maybeSingle()
  const defaultCheckInTime = (employee?.default_check_in_time as string | null) ?? null
  const defaultCheckOutTime = (employee?.default_check_out_time as string | null) ?? null
  return {
    shift: profileScheduleFromTimes(defaultCheckInTime, defaultCheckOutTime),
    defaultCheckInTime,
    defaultCheckOutTime,
  }
}

async function loadOpenAttendanceWorkDate(employeeId: string, now: Date): Promise<string | null> {
  await autoCloseOpenAttendanceSessions({ employeeId, now })
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("hr_attendance")
    .select("shift_date, check_in_at")
    .eq("employee_id", employeeId)
    .is("check_out_at", null)
    .order("check_in_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return (data.shift_date as string | null) ?? requestedWorkDateFromCheckIn(data.check_in_at as string)
}

function requestedWorkDateFromCheckIn(checkInAt: string): string {
  return new Date(new Date(checkInAt).getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)
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
  const [{ shift }, retroUsage, correctable, openWorkDate] = await Promise.all([
    loadProfileSchedule(employee.id),
    getRetroUsage(supabase, employee.id, now),
    getCorrectableDays(employee.id, now),
    loadOpenAttendanceWorkDate(employee.id, now),
  ])
  const effectiveDate = openWorkDate ?? requestedDate

  const withinWindow = isWithinRetroWindow(effectiveDate, shift, now)
  const deadline =
    shift && effectiveDate !== ictDateNow()
      ? getRetroDeadline(effectiveDate, shift, now).toISOString()
      : null

  return (
    <AttendanceManualClient
      defaultDate={effectiveDate}
      defaultTime={ictTimeNow()}
      today={ictDateNow()}
      retroUsage={retroUsage}
      withinRetroWindow={withinWindow}
      retroDeadline={deadline}
      correctableDays={correctable}
    />
  )
}
