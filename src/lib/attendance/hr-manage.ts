import {
  hasAttendanceOnIctDay,
  ictLocalToUtc,
} from "@/lib/attendance/ict-datetime"
import {
  recordAttendanceAdjustment,
  toAttendanceAuditSnapshot,
} from "@/lib/attendance/adjustment-log"
import { computePaidWorkMinutes } from "@/lib/attendance/paid-work-time"
import { lateMinutesAtCheckIn } from "@/lib/attendance/late"
import { resolveRegularWorkHours } from "@/lib/payroll/hour-policy"
import { getWorkStart } from "@/lib/runtime-config"
import { createClient } from "@/lib/supabase/server"

type HrWorkShift = {
  id: string
  start_hour: number
  start_minute: number
  end_hour: number
  end_minute: number
  crosses_midnight: boolean
  grace_minutes: number
}
const DAY_MS = 24 * 60 * 60 * 1000
const ATTENDANCE_SELECT =
  "id, employee_id, work_shift_id, shift_date, check_in_at, check_out_at, work_hours, is_late, check_in_location, check_out_location, location_review_status"

export type HrAttendanceInput = {
  date: string
  checkInTime: string
  checkOutTime?: string | null
  workHours?: number | null
  workShiftId?: string | null
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
    .select("id, start_hour, start_minute, end_hour, end_minute, crosses_midnight, grace_minutes")
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
  shift: HrWorkShift | null,
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

async function findOtherOpenAttendance(
  supabase: Awaited<ReturnType<typeof createClient>>,
  employeeId: string,
  excludeAttendanceId?: string
): Promise<{ id: string } | null> {
  let query = supabase
    .from("hr_attendance")
    .select("id")
    .eq("employee_id", employeeId)
    .is("check_out_at", null)
    .limit(1)

  if (excludeAttendanceId) {
    query = query.neq("id", excludeAttendanceId)
  }

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return (data as { id: string } | null) ?? null
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
    workHours = computePaidWorkMinutes({
      workDate: input.date,
      shiftDate: input.date,
      checkInAt,
      checkOutAt,
      shift: shift
        ? {
            start_hour: shift.start_hour,
            start_minute: shift.start_minute,
            end_hour: shift.end_hour,
            end_minute: shift.end_minute,
            grace_minutes: shift.grace_minutes,
            crosses_midnight: shift.crosses_midnight,
          }
        : null,
    }).paidHours
  }

  return { checkInAt, checkOutAt, workHours }
}

export async function createAttendanceByHr(
  employeeId: string,
  input: HrAttendanceInput,
  options?: {
    actorEmployeeId?: string | null
    reason?: string | null
  }
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
    .select("id, status, default_check_in_time, pay_type")
    .eq("id", employeeId)
    .maybeSingle()

  if (empError) throw empError
  if (!employee) throw new Error("ไม่พบพนักงาน")

  const payType = (employee.pay_type as string | null) ?? null

  if (!checkOutAt && (await findOtherOpenAttendance(supabase, employeeId))) {
    throw new Error("พนักงานมีรอบเข้างานที่ยังไม่ปิดอยู่แล้ว")
  }

  const isLate = await resolveIsLate(
    checkInAt,
    shift,
    (employee.default_check_in_time as string | null) ?? null
  )
  const payrollWorkHours = workHours != null ? resolveRegularWorkHours(payType, workHours) : null

  const { data, error } = await supabase
    .from("hr_attendance")
    .insert({
      employee_id: employeeId,
      work_shift_id: shift?.id ?? null,
      shift_date: input.date,
      check_in_at: checkInAt.toISOString(),
      check_out_at: checkOutAt?.toISOString() ?? null,
      work_hours: payrollWorkHours,
      is_late: isLate,
      check_in_location: null,
    })
    .select(ATTENDANCE_SELECT)
    .single()

  if (error) throw error
  await recordAttendanceAdjustment({
    attendanceId: data.id as string,
    actorEmployeeId: options?.actorEmployeeId ?? null,
    action: "hr_create",
    source: "hr_manual",
    reason: options?.reason ?? "HR created attendance manually",
    before: null,
    after: toAttendanceAuditSnapshot(data as Record<string, unknown>),
    metadata: { input },
  })
  return data
}

export async function updateAttendanceByHr(
  attendanceId: string,
  input: HrAttendanceInput,
  options?: {
    actorEmployeeId?: string | null
    reason?: string | null
  }
) {
  const supabase = await createClient()

  const { data: existing, error: loadError } = await supabase
    .from("hr_attendance")
    .select(ATTENDANCE_SELECT)
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

  if (
    !checkOutAt &&
    (await findOtherOpenAttendance(supabase, existing.employee_id, attendanceId))
  ) {
    throw new Error("พนักงานมีรอบเข้างานที่ยังไม่ปิดอยู่แล้ว")
  }

  const { data: employee, error: empError } = await supabase
    .from("hr_employees")
    .select("default_check_in_time, pay_type")
    .eq("id", existing.employee_id)
    .maybeSingle()

  if (empError) throw empError

  const isLate = await resolveIsLate(
    checkInAt,
    shift,
    (employee?.default_check_in_time as string | null) ?? null
  )
  const payType = (employee?.pay_type as string | null) ?? null
  const payrollWorkHours = workHours != null ? resolveRegularWorkHours(payType, workHours) : null

  const { data, error } = await supabase
    .from("hr_attendance")
    .update({
      work_shift_id: shift?.id ?? null,
      shift_date: input.date,
      check_in_at: checkInAt.toISOString(),
      check_out_at: checkOutAt?.toISOString() ?? null,
      work_hours: payrollWorkHours,
      is_late: isLate,
    })
    .eq("id", attendanceId)
    .select(ATTENDANCE_SELECT)
    .single()

  if (error) throw error
  await recordAttendanceAdjustment({
    attendanceId: data.id as string,
    actorEmployeeId: options?.actorEmployeeId ?? null,
    action: "hr_update",
    source: "hr_manual",
    reason: options?.reason ?? "HR updated attendance manually",
    before: toAttendanceAuditSnapshot(existing as Record<string, unknown>),
    after: toAttendanceAuditSnapshot(data as Record<string, unknown>),
    metadata: { input },
  })
  return data
}

export async function deleteAttendanceByHr(
  attendanceId: string,
  options?: {
    actorEmployeeId?: string | null
    reason?: string | null
  }
) {
  const supabase = await createClient()
  const { data: existing, error: loadError } = await supabase
    .from("hr_attendance")
    .select(ATTENDANCE_SELECT)
    .eq("id", attendanceId)
    .maybeSingle()

  if (loadError) throw loadError
  if (!existing) throw new Error("ไม่พบรายการเข้างาน")

  // Log BEFORE delete — FK on hr_attendance_adjustments.attendance_id
  // requires the row to still exist at insert time.
  await recordAttendanceAdjustment({
    attendanceId,
    actorEmployeeId: options?.actorEmployeeId ?? null,
    action: "hr_delete",
    source: "hr_manual",
    reason: options?.reason ?? "HR deleted attendance manually",
    before: toAttendanceAuditSnapshot(existing as Record<string, unknown>),
    after: null,
    metadata: {},
  })

  const { error } = await supabase
    .from("hr_attendance")
    .delete()
    .eq("id", attendanceId)

  if (error) throw error
}
