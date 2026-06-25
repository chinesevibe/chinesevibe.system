import type {
  AttendanceCalendarResult,
  AttendanceDayCell,
} from "@/features/attendance/calendar-types"
import { deriveAttendanceDayStatus } from "@/features/attendance/day-status"
import { computePaidWorkMinutes } from "@/lib/attendance/paid-work-time"
import { effectiveAttendanceIsLate } from "@/lib/attendance/late"
import { profileScheduleFromTimes } from "@/lib/attendance/profile-schedule"
import { ictLocalToUtc } from "@/lib/attendance/ict-datetime"
import { isEmployeeOffOnDate, parseOffDays } from "@/lib/employees/off-days"
import {
  getRetroDeadline,
  isWithinRetroWindow,
  type ShiftSchedule,
} from "@/lib/attendance/retro-limit"
import { getAttendanceGoLiveDate } from "@/lib/runtime-config"
import { createClient } from "@/lib/supabase/server"

export type {
  AttendanceDayCell,
  AttendanceDayStatus,
  AttendanceCalendarResult,
} from "@/features/attendance/calendar-types"

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000
const DAY_MS = 86_400_000

function monthRange(month: string): { start: string; end: string; days: string[] } {
  const [y, m] = month.split("-").map(Number)
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const days: string[] = []
  for (let d = 1; d <= lastDay; d++) {
    days.push(`${month}-${String(d).padStart(2, "0")}`)
  }
  return { start: `${month}-01`, end: days[days.length - 1]!, days }
}

function ictDateFromIso(iso: string): string {
  return new Date(new Date(iso).getTime() + ICT_OFFSET_MS).toISOString().slice(0, 10)
}

function formatIctTime(iso: string): string {
  const shifted = new Date(new Date(iso).getTime() + ICT_OFFSET_MS)
  const hh = String(shifted.getUTCHours()).padStart(2, "0")
  const mm = String(shifted.getUTCMinutes()).padStart(2, "0")
  return `${hh}:${mm}`
}

async function loadEmployeeSchedule(
  supabase: Awaited<ReturnType<typeof createClient>>,
  employeeId: string
): Promise<{
  shift: ShiftSchedule | null
  offDays: number[]
  defaultCheckInTime: string | null
  defaultCheckOutTime: string | null
}> {
  const selectAttempts = [
    "off_days, default_check_in_time, default_check_out_time",
    "default_check_in_time, default_check_out_time",
    "id",
  ]

  type EmployeeScheduleRow = {
    off_days?: unknown
    default_check_in_time?: string | null
    default_check_out_time?: string | null
  }

  let employee: EmployeeScheduleRow | null = null

  for (const select of selectAttempts) {
    const { data, error } = await supabase
      .from("hr_employees")
      .select(select)
      .eq("id", employeeId)
      .maybeSingle()
    if (!error) {
      employee = (data as EmployeeScheduleRow | null) ?? null
      break
    }
    if (!error.message?.includes("does not exist")) throw error
  }

  const defaultCheckInTime = (employee?.default_check_in_time as string | null) ?? null
  const defaultCheckOutTime = (employee?.default_check_out_time as string | null) ?? null

  return {
    shift: profileScheduleFromTimes(defaultCheckInTime, defaultCheckOutTime),
    offDays: parseOffDays(employee?.off_days),
    defaultCheckInTime,
    defaultCheckOutTime,
  }
}

export function resolveCalendarWorkHours(input: {
  checkInAt: string
  checkOutAt: string | null
  workHours: number | null
  shiftDate?: string | null
  shift: ShiftSchedule | null
  defaultCheckInTime: string | null
  defaultCheckOutTime: string | null
}): number | null {
  if (!input.checkOutAt) {
    return input.workHours != null ? Number(input.workHours) : null
  }

  const computed = computePaidWorkMinutes({
    workDate: input.shiftDate ?? undefined,
    shiftDate: input.shiftDate ?? undefined,
    checkInAt: new Date(input.checkInAt),
    checkOutAt: new Date(input.checkOutAt),
    shift: input.shift,
    defaultCheckInTime: input.defaultCheckInTime,
    defaultCheckOutTime: input.defaultCheckOutTime,
  })

  return Number.isFinite(computed.paidHours) ? computed.paidHours : input.workHours
}

async function loadDateOverrides(
  supabase: Awaited<ReturnType<typeof createClient>>,
  employeeId: string,
  from: string,
  to: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("hr_employee_date_overrides")
    .select("date")
    .eq("employee_id", employeeId)
    .gte("date", from)
    .lte("date", to)
  if (error) {
    console.warn("loadDateOverrides error (non-fatal)", error.message)
    return new Set()
  }
  return new Set((data ?? []).map((r) => r.date as string))
}

async function loadLeaveDates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  employeeId: string,
  from: string,
  to: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("hr_leaves")
    .select("start_date, end_date")
    .eq("employee_id", employeeId)
    .eq("status", "approved")
    .lte("start_date", to)
    .gte("end_date", from)
  if (error) throw error

  const dates = new Set<string>()
  for (const row of data ?? []) {
    const start = row.start_date as string
    const end = row.end_date as string
    let cursor = start
    while (cursor <= end) {
      if (cursor >= from && cursor <= to) dates.add(cursor)
      const [y, m, d] = cursor.split("-").map(Number)
      cursor = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
    }
  }
  return dates
}

function attendanceByDate(
  rows: Array<{
    id: string
    check_in_at: string
    check_out_at: string | null
    is_late: boolean
    work_hours: number | null
    shift_date: string | null
  }>
): Map<string, (typeof rows)[number]> {
  const map = new Map<string, (typeof rows)[number]>()
  for (const row of rows) {
    const date =
      (row.shift_date as string | null) ?? ictDateFromIso(row.check_in_at)
    if (!map.has(date)) map.set(date, row)
  }
  return map
}

export async function getEmployeeAttendanceCalendar(
  employeeId: string,
  month: string,
  now: Date = new Date()
): Promise<AttendanceCalendarResult> {
  const supabase = await createClient()
  const { start, end, days } = monthRange(month)
  const today = new Date(now.getTime() + ICT_OFFSET_MS).toISOString().slice(0, 10)

  const rangeStart = ictLocalToUtc(start, "00:00")
  const rangeEnd = new Date(ictLocalToUtc(end, "00:00").getTime() + DAY_MS)

  const [schedule, leaveDates, dateOverrides, attendanceRes, goLiveDate] = await Promise.all([
    loadEmployeeSchedule(supabase, employeeId),
    loadLeaveDates(supabase, employeeId, start, end),
    loadDateOverrides(supabase, employeeId, start, end),
    supabase
      .from("hr_attendance")
      .select("id, check_in_at, check_out_at, is_late, work_hours, shift_date")
      .eq("employee_id", employeeId)
      .gte("check_in_at", rangeStart.toISOString())
      .lt("check_in_at", rangeEnd.toISOString()),
    getAttendanceGoLiveDate(),
  ])
  const { shift, offDays, defaultCheckInTime, defaultCheckOutTime } = schedule

  if (attendanceRes.error) throw attendanceRes.error
  const byDate = attendanceByDate(attendanceRes.data ?? [])

  const cells: AttendanceDayCell[] = days.map((date) => {
    const record = byDate.get(date) ?? null
    const onLeave = leaveDates.has(date)
    const isDateOverride = dateOverrides.has(date)

    if (!onLeave && !record && (isDateOverride || isEmployeeOffOnDate(date, offDays))) {
      return {
        date,
        status: "off",
        checkIn: null,
        checkOut: null,
        hours: null,
        retroEligible: false,
        retroExpired: false,
        deadline: null,
        attendanceId: null,
        isDateOverride,
      }
    }

    const effectiveRecord = record
      ? {
          ...record,
          is_late: effectiveAttendanceIsLate(
            record.check_in_at,
            shift,
            record.is_late,
            defaultCheckInTime
          ),
        }
      : null

    const status = deriveAttendanceDayStatus(
      date,
      today,
      now,
      shift,
      onLeave,
      effectiveRecord,
      goLiveDate
    )
    const withinRetro =
      shift !== null &&
      status !== "on_leave" &&
      status !== "off" &&
      status !== "no_shift" &&
      status !== "future" &&
      (status === "missing_checkin" || status === "missing_checkout") &&
      isWithinRetroWindow(date, shift, now)
    const expired =
      (status === "missing_checkin" || status === "missing_checkout") &&
      shift !== null &&
      !withinRetro

    return {
      date,
      status: expired ? "retro_expired" : status,
      checkIn: record ? formatIctTime(record.check_in_at) : null,
      checkOut: record?.check_out_at ? formatIctTime(record.check_out_at) : null,
      hours: record
        ? resolveCalendarWorkHours({
            checkInAt: record.check_in_at,
            checkOutAt: record.check_out_at,
            workHours: record.work_hours != null ? Number(record.work_hours) : null,
            shiftDate: record.shift_date,
            shift,
            defaultCheckInTime,
            defaultCheckOutTime,
          })
        : null,
      retroEligible: withinRetro,
      retroExpired: expired,
      deadline:
        shift && (status === "missing_checkin" || status === "missing_checkout")
          ? getRetroDeadline(date, shift, now).toISOString()
          : null,
      attendanceId: record?.id ?? null,
      isDateOverride: false,
    }
  })

  return { month, days: cells, shift }
}

export async function getCorrectableDays(
  employeeId: string,
  now: Date = new Date()
): Promise<
  Array<{
    workDate: string
    issue: "missing_checkin" | "missing_checkout"
    deadline: string
  }>
> {
  const shifted = new Date(now.getTime() + ICT_OFFSET_MS)
  const month = `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`
  const prevMonthDate = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() - 1, 1))
  const prevMonth = `${prevMonthDate.getUTCFullYear()}-${String(prevMonthDate.getUTCMonth() + 1).padStart(2, "0")}`

  const [current, previous] = await Promise.all([
    getEmployeeAttendanceCalendar(employeeId, month, now),
    getEmployeeAttendanceCalendar(employeeId, prevMonth, now),
  ])

  const items: Array<{
    workDate: string
    issue: "missing_checkin" | "missing_checkout"
    deadline: string
  }> = []

  for (const cell of [...previous.days, ...current.days]) {
    if (!cell.retroEligible || !cell.deadline) continue
    items.push({
      workDate: cell.date,
      issue:
        cell.status === "missing_checkout" ? "missing_checkout" : "missing_checkin",
      deadline: cell.deadline,
    })
  }

  return items.sort((a, b) => b.workDate.localeCompare(a.workDate))
}
