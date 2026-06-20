import { computePaidWorkMinutes } from "@/lib/attendance/paid-work-time"
import { finalizeAttendanceRecord } from "@/lib/attendance/finalize-attendance-record"
import { getAdminClient } from "@/lib/auth/admin-client"
import { ictDateFromUtc, ictLocalToUtc } from "@/lib/attendance/ict-datetime"

const SESSION_CUTOFF_TIME_ICT = "06:00"
const MIN_NEXT_SESSION_GAP_MS = 8 * 60 * 60 * 1000

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
}

export function sessionCutoffUtcForCheckIn(checkInAt: Date): Date {
  const workDate = ictDateFromUtc(checkInAt)
  let cutoffAt = ictLocalToUtc(workDate, SESSION_CUTOFF_TIME_ICT)
  if (cutoffAt.getTime() <= checkInAt.getTime()) {
    const nextDay = new Date(cutoffAt.getTime() + 24 * 60 * 60 * 1000)
    cutoffAt = nextDay
  }
  return cutoffAt
}

export function sessionCycleStartUtc(now: Date): Date {
  const todayCutoff = ictLocalToUtc(ictDateFromUtc(now), SESSION_CUTOFF_TIME_ICT)
  if (now.getTime() >= todayCutoff.getTime()) {
    return todayCutoff
  }
  return new Date(todayCutoff.getTime() - 24 * 60 * 60 * 1000)
}

export function isCheckoutStillInActiveCycle(checkOutAt: Date, now: Date): boolean {
  return now.getTime() - checkOutAt.getTime() < MIN_NEXT_SESSION_GAP_MS
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
    .select("id, branch_id")
    .in("id", employeeIds)

  if (employeeError) throw employeeError

  const employeeById = new Map(
    ((employees ?? []) as EmployeeBranchRow[]).map((row) => [row.id, row.branch_id])
  )

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

    const { data: updatedRows, error: updateError } = await admin
      .from("hr_attendance")
      .update({
        check_out_at: checkOutAt.toISOString(),
        work_hours: paid.paidHours,
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
      branchId: employeeById.get(row.employee_id) ?? null,
      workDate,
      workHours: paid.paidHours,
      now: checkOutAt,
    })
  }

  return { closedCount }
}
