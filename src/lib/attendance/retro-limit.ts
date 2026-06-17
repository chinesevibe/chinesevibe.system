import type { SupabaseClient } from "@supabase/supabase-js"

import { ictLocalToUtc } from "@/lib/attendance/ict-datetime"
function ictDateFromInstant(date: Date = new Date()): string {
  return new Date(date.getTime() + ICT_OFFSET_MS).toISOString().slice(0, 10)
}

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const RETRO_WINDOW_MS = 48 * HOUR_MS
export const RETRO_MONTHLY_LIMIT = 3

export type ShiftSchedule = {
  start_hour: number
  start_minute: number
  end_hour: number
  end_minute: number
  crosses_midnight: boolean
  grace_minutes: number
}

export type RetroCorrectionType = "checkin" | "checkout"

export type CorrectableDay = {
  workDate: string
  issue: "missing_checkin" | "missing_checkout"
  deadline: string
  retroEligible: boolean
}

function padTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

function addIctDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + days))
  return next.toISOString().slice(0, 10)
}

export function getShiftStartUtc(workDate: string, shift: ShiftSchedule): Date {
  return ictLocalToUtc(workDate, padTime(shift.start_hour, shift.start_minute))
}

export function getShiftEndUtc(workDate: string, shift: ShiftSchedule): Date {
  const endDate = shift.crosses_midnight ? addIctDays(workDate, 1) : workDate
  return ictLocalToUtc(endDate, padTime(shift.end_hour, shift.end_minute))
}

export function getShiftDayEndUtc(workDate: string, shift: ShiftSchedule | null): Date {
  if (shift) {
    return getShiftEndUtc(workDate, shift)
  }
  const dayStart = ictLocalToUtc(workDate, "00:00")
  return new Date(dayStart.getTime() + DAY_MS - 1)
}

export function getRetroDeadline(
  workDate: string,
  shift: ShiftSchedule | null,
  now: Date = new Date()
): Date {
  void now
  return new Date(getShiftDayEndUtc(workDate, shift).getTime() + RETRO_WINDOW_MS)
}

export function isWithinRetroWindow(
  workDate: string,
  shift: ShiftSchedule | null,
  now: Date = new Date()
): boolean {
  return now.getTime() <= getRetroDeadline(workDate, shift, now).getTime()
}

export function ictMonthKey(date: Date = new Date()): string {
  const shifted = new Date(date.getTime() + ICT_OFFSET_MS)
  const y = shifted.getUTCFullYear()
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

function monthRangeUtc(monthKey: string): { start: string; end: string } {
  const [y, m] = monthKey.split("-").map(Number)
  const start = new Date(Date.UTC(y, m - 1, 1) - ICT_OFFSET_MS)
  const end = new Date(Date.UTC(y, m, 1) - ICT_OFFSET_MS)
  return { start: start.toISOString(), end: end.toISOString() }
}

export async function countRetroUsageThisMonth(
  supabase: SupabaseClient,
  employeeId: string,
  now: Date = new Date()
): Promise<number> {
  const monthKey = ictMonthKey(now)
  const { start, end } = monthRangeUtc(monthKey)
  const { count, error } = await supabase
    .from("hr_attendance_corrections")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", employeeId)
    .eq("source", "employee")
    .gte("created_at", start)
    .lt("created_at", end)

  if (error) throw error
  return count ?? 0
}

export function correctionCost(
  mode: "checkin" | "checkout" | "full"
): RetroCorrectionType[] {
  if (mode === "full") return ["checkin", "checkout"]
  return [mode]
}

export function needsRetroEnforcement(
  mode: "checkin" | "checkout" | "full",
  workDate: string,
  existing: { check_in_at: string; check_out_at: string | null } | null,
  now: Date = new Date()
): boolean {
  const today = ictDateFromInstant(now)

  if (workDate > today) return false

  if (mode === "checkout" && existing && !existing.check_out_at && workDate === today) {
    return false
  }

  if (!existing) return true
  if (mode === "checkin" || mode === "full") return true
  if (mode === "checkout" && !existing.check_out_at) {
    return workDate < today
  }
  return true
}

export async function assertRetroAllowance(
  supabase: SupabaseClient,
  employeeId: string,
  mode: "checkin" | "checkout" | "full",
  now: Date = new Date()
): Promise<void> {
  const used = await countRetroUsageThisMonth(supabase, employeeId, now)
  const cost = correctionCost(mode).length
  if (used + cost > RETRO_MONTHLY_LIMIT) {
    throw new Error(
      `ใช้สิทธิ์ลงเวลาย้อนหลังครบ ${RETRO_MONTHLY_LIMIT} ครั้ง/เดือนแล้ว — กรุณาติดต่อ HR`
    )
  }
}

export function assertRetroWindow(
  workDate: string,
  shift: ShiftSchedule | null,
  now: Date = new Date()
): void {
  if (isWithinRetroWindow(workDate, shift, now)) return
  throw new Error(
    "หมดเวลาลงเวลาย้อนหลัง (48 ชม. หลังเลิกกะ) — กรุณาติดต่อ HR"
  )
}

export async function recordRetroCorrections(
  supabase: SupabaseClient,
  input: {
    employeeId: string
    workDate: string
    mode: "checkin" | "checkout" | "full"
    attendanceId: string
    createdBy: string
    source?: "employee" | "hr"
  }
): Promise<void> {
  const source = input.source ?? "employee"
  const types = correctionCost(input.mode)
  const rows = types.map((correction_type) => ({
    employee_id: input.employeeId,
    work_date: input.workDate,
    correction_type,
    source,
    attendance_id: input.attendanceId,
    created_by: input.createdBy,
  }))

  const { error } = await supabase.from("hr_attendance_corrections").insert(rows)
  if (error) throw error
}

export async function getRetroUsage(
  supabase: SupabaseClient,
  employeeId: string,
  now: Date = new Date()
): Promise<{ used: number; limit: number; remaining: number }> {
  const used = await countRetroUsageThisMonth(supabase, employeeId, now)
  return {
    used,
    limit: RETRO_MONTHLY_LIMIT,
    remaining: Math.max(0, RETRO_MONTHLY_LIMIT - used),
  }
}

export function isPastShiftStart(
  workDate: string,
  shift: ShiftSchedule,
  now: Date = new Date()
): boolean {
  const start = getShiftStartUtc(workDate, shift)
  const graceMs = shift.grace_minutes * 60_000
  return now.getTime() > start.getTime() + graceMs
}

export function isPastShiftEnd(
  workDate: string,
  shift: ShiftSchedule,
  now: Date = new Date()
): boolean {
  return now.getTime() > getShiftEndUtc(workDate, shift).getTime()
}
