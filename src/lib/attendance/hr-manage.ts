import {
  computeWorkHours,
  hasAttendanceOnIctDay,
  ictLocalToUtc,
} from "@/lib/attendance/ict-datetime"
import { ictDayRangeUtc, lateMinutes } from "@/lib/attendance/late"
import { getWorkStart } from "@/lib/runtime-config"
import { createClient } from "@/lib/supabase/server"

type HrWorkShift = {
  id: string
  start_hour: number
  start_minute: number
  crosses_midnight: boolean
  grace_minutes: number
}
const DAY_MS = 24 * 60 * 60 * 1000

export type HrAttendanceInput = {
  date: string
  checkInTime: string
  checkOutTime?: string | null
  workHours?: number | null
  workShiftId?: string | null
}

function parseShiftMinute(shift: HrWorkShift): number {
  return shift.start_hour * 60 + shift.start_minute
}

function lateByShift(checkInAt: Date, shift: HrWorkShift): boolean {
  const nowMinutes = (() => {
    const { start } = ictDayRangeUtc(checkInAt)
    const rawMinutes = Math.floor(
      (checkInAt.getTime() - start.getTime()) / 60_000 + 24 * 60
    ) % (24 * 60)
    return rawMinutes
  })()

  const shiftStart = parseShiftMinute(shift)
  let lateStart = shiftStart
  if (shift.crosses_midnight && nowMinutes < shiftStart) {
    lateStart -= 24 * 60
  }

  return nowMinutes - shift.grace_minutes - lateStart > 0
}

function normalizeShiftId(workShiftId: string | null | undefined): string | null {
  const trimmed = workShiftId?.trim()
  return trimmed ? trimmed : null
}

async function resolveShift(
  supabase: Awaited<ReturnType<typeof createClient>>,
  employeeId: string,
  requestedShiftId?: string | null
): Promise<HrWorkShift | null> {
  const resolvedRequestedShiftId = normalizeShiftId(requestedShiftId)

  let shiftId = resolvedRequestedShiftId

  if (!shiftId) {
    const { data: employee, error: employeeError } = await supabase
      .from("hr_employees")
      .select("work_shift_id")
      .eq("id", employeeId)
      .maybeSingle()

    if (employeeError) throw employeeError
    shiftId = (employee?.work_shift_id as string | null) ?? null
  }

  if (!shiftId) return null

  const query = await supabase
    .from("hr_work_shifts")
    .select("id, start_hour, start_minute, crosses_midnight, grace_minutes")
    .eq("id", shiftId)
    .eq("is_active", true)
    .maybeSingle()

  if (query.error) throw query.error

  if (!query.data) {
    if (resolvedRequestedShiftId) {
      throw new Error("ไม่พบกะที่เลือก")
    }
    return null
  }

  return query.data as HrWorkShift
}

async function resolveIsLate(
  checkInAt: Date,
  shift: HrWorkShift | null
): Promise<boolean> {
  if (!shift) {
    const { hour, minute } = await getWorkStart()
    return lateMinutes(checkInAt, hour, minute) > 0
  }
  return lateByShift(checkInAt, shift)
}

function parseInput(
  input: HrAttendanceInput,
  shift: HrWorkShift | null
): {
  checkInAt: Date
  checkOutAt: Date | null
  workHours: number | null
} {
  const checkInAt = ictLocalToUtc(input.date, input.checkInTime)
  let checkOutAt =
    input.checkOutTime && input.checkOutTime.trim()
      ? ictLocalToUtc(input.date, input.checkOutTime)
      : null

  if (
    checkOutAt &&
    checkOutAt.getTime() <= checkInAt.getTime()
  ) {
    if (shift?.crosses_midnight) {
      checkOutAt = new Date(checkOutAt.getTime() + DAY_MS)
    } else {
      throw new Error("เวลาออกต้องหลังเวลาเข้า")
    }
  }

  let workHours: number | null = null
  if (input.workHours != null && String(input.workHours).trim() !== "") {
    const parsed = Number(input.workHours)
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 24) {
      throw new Error("ชม.การทำงานไม่ถูกต้อง (0–24)")
    }
    workHours = Math.round(parsed * 100) / 100
  } else if (checkOutAt) {
    workHours = computeWorkHours(checkInAt, checkOutAt)
  }

  return { checkInAt, checkOutAt, workHours }
}

export async function createAttendanceByHr(
  employeeId: string,
  input: HrAttendanceInput
) {
  const supabase = await createClient()
  const shift = await resolveShift(supabase, employeeId, input.workShiftId)
  const { checkInAt, checkOutAt, workHours } = parseInput(input, shift)

  const duplicate = await hasAttendanceOnIctDay(supabase, employeeId, checkInAt)
  if (duplicate) {
    throw new Error("พนักงานมีบันทึกเข้างานวันนี้แล้ว — แก้ไขรายการเดิมแทน")
  }

  const { data: employee, error: empError } = await supabase
    .from("hr_employees")
    .select("id, status")
    .eq("id", employeeId)
    .maybeSingle()

  if (empError) throw empError
  if (!employee) throw new Error("ไม่พบพนักงาน")

  const isLate = await resolveIsLate(checkInAt, shift)

  const { data, error } = await supabase
    .from("hr_attendance")
    .insert({
      employee_id: employeeId,
      work_shift_id: shift?.id ?? null,
      shift_date: input.date,
      check_in_at: checkInAt.toISOString(),
      check_out_at: checkOutAt?.toISOString() ?? null,
      work_hours: workHours,
      is_late: isLate,
      check_in_location: null,
    })
    .select("id")
    .single()

  if (error) throw error
  return data
}

export async function updateAttendanceByHr(
  attendanceId: string,
  input: HrAttendanceInput
) {
  const supabase = await createClient()

  const { data: existing, error: loadError } = await supabase
    .from("hr_attendance")
    .select("id, employee_id, work_shift_id")
    .eq("id", attendanceId)
    .maybeSingle()

  if (loadError) throw loadError
  if (!existing) throw new Error("ไม่พบรายการเข้างาน")

  const shift = await resolveShift(
    supabase,
    existing.employee_id,
    input.workShiftId ?? (existing.work_shift_id as string | null)
  )
  const { checkInAt, checkOutAt, workHours } = parseInput(input, shift)

  const duplicate = await hasAttendanceOnIctDay(
    supabase,
    existing.employee_id,
    checkInAt,
    attendanceId
  )
  if (duplicate) {
    throw new Error("พนักงานมีบันทึกเข้างานวันนี้อยู่แล้ว")
  }

  const isLate = await resolveIsLate(checkInAt, shift)

  const { data, error } = await supabase
    .from("hr_attendance")
    .update({
      work_shift_id: shift?.id ?? null,
      shift_date: input.date,
      check_in_at: checkInAt.toISOString(),
      check_out_at: checkOutAt?.toISOString() ?? null,
      work_hours: workHours,
      is_late: isLate,
    })
    .eq("id", attendanceId)
    .select("id")
    .single()

  if (error) throw error
  return data
}

export async function deleteAttendanceByHr(attendanceId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("hr_attendance")
    .delete()
    .eq("id", attendanceId)

  if (error) throw error
}
