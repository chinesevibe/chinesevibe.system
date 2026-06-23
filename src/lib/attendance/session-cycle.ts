import { computePaidWorkMinutes } from "@/lib/attendance/paid-work-time"
import { finalizeAttendanceRecord } from "@/lib/attendance/finalize-attendance-record"
import { getAdminClient } from "@/lib/auth/admin-client"
import { ictDateFromUtc } from "@/lib/attendance/ict-datetime"
import { resolveRegularWorkHours } from "@/lib/payroll/hour-policy"

// Stale-session window: auto-close any open record more than 24h old.
const STALE_SESSION_MS = 24 * 60 * 60 * 1000

// Display window: show a completed session on UI for 2h after checkout.
const SESSION_DISPLAY_MS = 2 * 60 * 60 * 1000

// Cooldown window: prevent a new check-in too soon after a completed checkout.
const RECHECKIN_GAP_MS = 8 * 60 * 60 * 1000

/**
 * Start of the "current session query window" = now - 24h rolling.
 * Pure session model: no ICT-day boundary, second param ignored.
 */
export function sessionCycleStartUtc(now: Date, _defaultCheckInTime?: string | null): Date {
  return new Date(now.getTime() - STALE_SESSION_MS)
}

/**
 * A completed session stays visible on UI for 2h after checkout.
 * After that the state resets so the employee can start a new session.
 */
export function isCheckoutStillInActiveCycle(checkOutAt: Date, now: Date): boolean {
  return now.getTime() - checkOutAt.getTime() < SESSION_DISPLAY_MS
}

export function isRecheckinBlockedAfterCheckout(checkOutAt: Date, now: Date): boolean {
  return now.getTime() - checkOutAt.getTime() < RECHECKIN_GAP_MS
}

export function recheckinAvailableAt(checkOutAt: Date): Date {
  return new Date(checkOutAt.getTime() + RECHECKIN_GAP_MS)
}

type AdminClient = ReturnType<typeof getAdminClient>

type OpenAttendanceRow = {
  id: string
  employee_id: string
  check_in_at: string
  shift_date: string | null
}

type EmployeeBranchRow = {
  id: string
  branch_id: string | null
  pay_type: string | null
}

export function sessionCutoffUtcForCheckIn(checkInAt: Date): Date {
  return new Date(checkInAt.getTime() + STALE_SESSION_MS)
}

export async function autoCloseOpenAttendanceSessions({
  admin = getAdminClient(),
  employeeId,
  now = new Date(),
}: {
  admin?: AdminClient
  employeeId?: string
  now?: Date
}): Promise<{ closedCount: number }> {
  let query = admin
    .from("hr_attendance")
    .select("id, employee_id, check_in_at, shift_date")
    .is("check_out_at", null)

  if (employeeId) {
    query = query.eq("employee_id", employeeId)
  }

  const { data, error } = await query.order("check_in_at", { ascending: true })
  if (error) throw error

  const rows = ((data ?? []) as OpenAttendanceRow[]).filter((row) => {
    const checkInAt = new Date(row.check_in_at)
    return (
      !Number.isNaN(checkInAt.getTime()) &&
      sessionCutoffUtcForCheckIn(checkInAt).getTime() <= now.getTime()
    )
  })

  if (rows.length === 0) {
    return { closedCount: 0 }
  }

  const employeeIds = [...new Set(rows.map((row) => row.employee_id))]
  const { data: employees, error: employeeError } = await admin
    .from("hr_employees")
    .select("id, branch_id, pay_type")
    .in("id", employeeIds)

  if (employeeError) throw employeeError

  const employeeById = new Map(((employees ?? []) as EmployeeBranchRow[]).map((row) => [row.id, row]))

  let closedCount = 0

  for (const row of rows) {
    const checkInAt = new Date(row.check_in_at)
    const checkOutAt = sessionCutoffUtcForCheckIn(checkInAt)
    const workDate = row.shift_date ?? ictDateFromUtc(checkInAt)
    const paid = computePaidWorkMinutes({
      checkInAt,
      checkOutAt,
      shift: null,
    })
    const workHours = resolveRegularWorkHours(
      employeeById.get(row.employee_id)?.pay_type ?? null,
      paid.paidHours
    )

    const { data: updatedRows, error: updateError } = await admin
      .from("hr_attendance")
      .update({
        check_out_at: checkOutAt.toISOString(),
        work_hours: workHours,
      })
      .eq("id", row.id)
      .is("check_out_at", null)
      .select("id")

    if (updateError) throw updateError
    if (!updatedRows || updatedRows.length === 0) continue

    closedCount += 1
    await finalizeAttendanceRecord({
      attendanceId: row.id,
      employeeId: row.employee_id,
      branchId: employeeById.get(row.employee_id)?.branch_id ?? null,
      workDate,
      workHours: workHours ?? 0,
      payType: employeeById.get(row.employee_id)?.pay_type ?? null,
      now: checkOutAt,
    })
  }

  return { closedCount }
}
