import type { SupabaseClient } from "@supabase/supabase-js"

import { finalizeAttendanceRecord } from "@/lib/attendance/finalize-attendance-record"
import { ictLocalToUtc } from "@/lib/attendance/ict-datetime"
import { computePaidWorkMinutes } from "@/lib/attendance/paid-work-time"
import { lateMinutesAtCheckIn } from "@/lib/attendance/late"
import {
  assertRetroAllowance,
  assertRetroWindow,
  needsRetroEnforcement,
  recordRetroCorrections,
  type ShiftSchedule,
} from "@/lib/attendance/retro-limit"
import { getWorkStart } from "@/lib/runtime-config"
import { createClient } from "@/lib/supabase/server"

type EmployeeManualMode = "checkin" | "checkout" | "full"

export type ManualAttendancePayload = {
  employeeId: string
  date: string
  shiftId?: string | null
  mode: EmployeeManualMode
  checkInTime?: string
  checkOutTime?: string
  /** HR bypasses retro window and quota */
  source?: "employee" | "hr"
  actorEmployeeId?: string
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 24 * 60 * 60 * 1000

export type ManualAttendanceResult = {
  id: string
  status: "checkin_saved" | "checkout_saved" | "both_saved"
}

export type ActiveShift = ShiftSchedule & {
  id: string
  code: string
  name: string
}

function parseDate(value: string): string {
  if (!DATE_RE.test(value)) {
    throw new Error("รูปแบบวันที่ไม่ถูกต้อง")
  }
  return value
}

function parseTime(value: string | undefined, label: string): string {
  if (!value) {
    throw new Error(`${label}ไม่ครบถ้วน`)
  }
  if (!TIME_RE.test(value)) {
    throw new Error(`${label}ไม่ถูกต้อง`)
  }
  return value
}

function ictDayWindow(date: string): { start: Date; end: Date } {
  const start = ictLocalToUtc(date, "00:00")
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) }
}

function parseCheckTime(date: string, time: string): Date {
  return ictLocalToUtc(date, time)
}

async function resolveShift(
  supabase: SupabaseClient,
  employeeId: string,
  requestedShiftId?: string | null
): Promise<ActiveShift | null> {
  if (requestedShiftId) {
    const { data, error } = await supabase
      .from("hr_work_shifts")
      .select(
        "id, code, name, start_hour, start_minute, end_hour, end_minute, crosses_midnight, grace_minutes"
      )
      .eq("id", requestedShiftId)
      .eq("is_active", true)
      .maybeSingle()

    if (error) throw error
    if (!data) {
      throw new Error("ไม่พบกะที่เลือก")
    }
    return data as ActiveShift
  }

  const { data: employee, error: employeeError } = await supabase
    .from("hr_employees")
    .select("work_shift_id")
    .eq("id", employeeId)
    .maybeSingle()

  if (employeeError) throw employeeError
  if (!employee?.work_shift_id) return null

  const { data, error } = await supabase
    .from("hr_work_shifts")
    .select(
      "id, code, name, start_hour, start_minute, end_hour, end_minute, crosses_midnight, grace_minutes"
    )
    .eq("id", employee.work_shift_id)
    .eq("is_active", true)
    .maybeSingle()

  if (error) throw error
  return (data as ActiveShift | null) ?? null
}

async function isLate(
  checkInAt: Date,
  shift: ActiveShift | null,
  defaultCheckInTime: string | null
): Promise<boolean> {
  const { hour, minute } = await getWorkStart()
  return (
    lateMinutesAtCheckIn(
      checkInAt,
      shift,
      { hour, minute },
      defaultCheckInTime
    ) > 0
  )
}

function resolveFinalCheckOut(
  mode: EmployeeManualMode,
  existingCheckOutAt: Date | null,
  providedCheckOutAt: Date | null
): Date | null | undefined {
  if (mode === "full") {
    return providedCheckOutAt
  }

  if (mode === "checkout") {
    return providedCheckOutAt
  }

  if (existingCheckOutAt) {
    return existingCheckOutAt
  }

  return null
}

function assertSequence(
  checkInAt: Date,
  checkOutAt: Date | null | undefined
): void {
  if (!checkInAt) {
    throw new Error("ยังไม่มีข้อมูลเช็คอินวันนี้")
  }
  if (checkOutAt && checkOutAt.getTime() <= checkInAt.getTime()) {
    throw new Error("เวลาออกต้องอยู่หลังเวลาเข้า")
  }
}

export async function saveManualAttendance(
  payload: ManualAttendancePayload
): Promise<ManualAttendanceResult> {
  const date = parseDate(payload.date)
  const mode = payload.mode

  const needsCheckIn = mode !== "checkout"
  const needsCheckOut = mode === "checkout" || mode === "full"

  const checkInTime = needsCheckIn
    ? parseTime(payload.checkInTime, "เวลาเข้า")
    : undefined
  const checkOutTime = needsCheckOut
    ? parseTime(payload.checkOutTime, "เวลาออก")
    : undefined

  const checkInAt = checkInTime ? parseCheckTime(date, checkInTime) : null
  const checkOutAt = checkOutTime ? parseCheckTime(date, checkOutTime) : null

  const supabase = await createClient()
  const shift = await resolveShift(supabase, payload.employeeId, payload.shiftId)

  const { data: employeeRow, error: employeeError } = await supabase
    .from("hr_employees")
    .select("branch_id, default_check_in_time, default_check_out_time, pay_type")
    .eq("id", payload.employeeId)
    .maybeSingle()

  if (employeeError) throw employeeError
  const branchId = (employeeRow?.branch_id as string | null) ?? null
  const defaultCheckInTime =
    (employeeRow?.default_check_in_time as string | null) ?? null
  const defaultCheckOutTime =
    (employeeRow?.default_check_out_time as string | null) ?? null

  const { start, end } = ictDayWindow(date)
  const { data: rows, error } = await supabase
    .from("hr_attendance")
    .select("id, check_in_at, check_out_at, work_hours")
    .eq("employee_id", payload.employeeId)
    .gte("check_in_at", start.toISOString())
    .lt("check_in_at", end.toISOString())
    .order("check_in_at", { ascending: true })
    .limit(1)

  if (error) {
    throw error
  }

  const existing = rows?.[0]
  const source = payload.source ?? "employee"
  const now = new Date()

  if (!existing && mode === "checkout") {
    throw new Error(
      "ยังไม่มีข้อมูลเช็คอินวันนี้ — กรุณาลงเวลาเข้าย้อนหลังก่อน (ภายใน 48 ชม.)"
    )
  }

  if (
    source === "employee" &&
    needsRetroEnforcement(mode, date, existing ?? null, now)
  ) {
    assertRetroWindow(date, shift, now)
    await assertRetroAllowance(supabase, payload.employeeId, mode, now)
  }

  const existingCheckInAt = existing ? new Date(existing.check_in_at) : null
  const existingCheckOutAt =
    existing && existing.check_out_at ? new Date(existing.check_out_at) : null

  const finalCheckInAt = mode === "full" || mode === "checkin" ? checkInAt : existingCheckInAt
  if (!finalCheckInAt) {
    throw new Error("ยังไม่มีข้อมูลเช็คอินวันนี้")
  }

  const finalCheckOutAt = resolveFinalCheckOut(
    mode,
    existingCheckOutAt,
    checkOutAt
  )

  if (
    shift?.crosses_midnight &&
    finalCheckInAt &&
    finalCheckOutAt &&
    finalCheckOutAt.getTime() <= finalCheckInAt.getTime()
  ) {
    finalCheckOutAt.setTime(finalCheckOutAt.getTime() + DAY_MS)
  }

  assertSequence(finalCheckInAt, finalCheckOutAt)

  const finalWorkHours = finalCheckOutAt
    ? computePaidWorkMinutes({
        workDate: date,
        shiftDate: date,
        checkInAt: finalCheckInAt,
        checkOutAt: finalCheckOutAt,
        shift: shift
          ? {
              start_hour: shift.start_hour,
              start_minute: shift.start_minute,
              end_hour: shift.end_hour,
              end_minute: shift.end_minute,
              crosses_midnight: shift.crosses_midnight,
            }
          : null,
        defaultCheckInTime: defaultCheckInTime ?? undefined,
        defaultCheckOutTime: defaultCheckOutTime ?? undefined,
      }).paidHours
    : existing
      ? existing.work_hours != null
        ? Number(existing.work_hours)
        : null
      : null

  const isLateNow = await isLate(finalCheckInAt, shift, defaultCheckInTime)

  if (!existing) {
    const { data: inserted, error: insertError } = await supabase
      .from("hr_attendance")
      .insert({
        employee_id: payload.employeeId,
        work_shift_id: shift?.id ?? null,
        shift_date: date,
        check_in_at: finalCheckInAt.toISOString(),
        check_out_at: finalCheckOutAt
          ? finalCheckOutAt.toISOString()
          : null,
        work_hours: finalWorkHours,
        is_late: isLateNow,
        check_in_location: null,
      })
      .select("id")
      .single()

    if (insertError) throw insertError

    if (finalCheckOutAt && finalWorkHours != null) {
      await finalizeAttendanceRecord({
        attendanceId: inserted.id as string,
        employeeId: payload.employeeId,
        branchId,
        workDate: date,
        workHours: finalWorkHours,
      })
    }

    if (
      source === "employee" &&
      needsRetroEnforcement(mode, date, null, now)
    ) {
      await recordRetroCorrections(supabase, {
        employeeId: payload.employeeId,
        workDate: date,
        mode,
        attendanceId: inserted.id as string,
        createdBy: payload.actorEmployeeId ?? payload.employeeId,
      })
    }

    return {
      id: inserted.id,
      status: mode === "full" ? "both_saved" : "checkin_saved",
    }
  }

  const updates: Record<string, unknown> = {
    work_shift_id: shift?.id ?? null,
    shift_date: date,
    is_late: isLateNow,
    work_hours: finalWorkHours,
    check_in_location: null,
  }

  if (mode === "checkin" || mode === "full") {
    updates.check_in_at = finalCheckInAt.toISOString()
  }

  if (mode === "checkout" || mode === "full") {
    updates.check_out_at = finalCheckOutAt ? finalCheckOutAt.toISOString() : null
  }

  const { data: updated, error: updateError } = await supabase
    .from("hr_attendance")
    .update(updates)
    .eq("id", existing.id)
    .select("id")
    .single()

  if (updateError) {
    throw updateError
  }

  if (finalCheckOutAt && finalWorkHours != null) {
    await finalizeAttendanceRecord({
      attendanceId: updated.id as string,
      employeeId: payload.employeeId,
      branchId,
      workDate: date,
      workHours: finalWorkHours,
    })
  }

  if (
    source === "employee" &&
    needsRetroEnforcement(mode, date, existing, now)
  ) {
    await recordRetroCorrections(supabase, {
      employeeId: payload.employeeId,
      workDate: date,
      mode,
      attendanceId: updated.id as string,
      createdBy: payload.actorEmployeeId ?? payload.employeeId,
    })
  }

  return {
    id: updated.id,
    status:
      mode === "full"
        ? "both_saved"
        : mode === "checkin"
          ? "checkin_saved"
          : "checkout_saved",
  }
}
