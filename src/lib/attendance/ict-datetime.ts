import { ictDayRangeUtc, formatIctTime } from "@/lib/attendance/late"

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000

/** ICT calendar date (YYYY-MM-DD) from a UTC instant. */
export function ictDateFromUtc(date: Date): string {
  return new Date(date.getTime() + ICT_OFFSET_MS).toISOString().slice(0, 10)
}

/** HH:mm in ICT from a UTC instant. */
export function ictTimeFromUtc(date: Date): string {
  return formatIctTime(date)
}

/** Combine ICT date + time into a UTC instant for DB storage. */
export function ictLocalToUtc(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  const [hh, mm] = timeStr.split(":").map(Number)
  if (
    !Number.isFinite(y) ||
    !Number.isFinite(m) ||
    !Number.isFinite(d) ||
    !Number.isFinite(hh) ||
    !Number.isFinite(mm)
  ) {
    throw new Error("invalid datetime")
  }
  const ictAsUtcMs = Date.UTC(y, m - 1, d, hh, mm, 0, 0)
  return new Date(ictAsUtcMs - ICT_OFFSET_MS)
}

export function computeWorkHours(
  checkInAt: Date,
  checkOutAt: Date | null
): number | null {
  if (!checkOutAt) return null
  const minutes = Math.max(
    0,
    Math.floor((checkOutAt.getTime() - checkInAt.getTime()) / 60_000)
  )
  return Math.round((minutes / 60) * 100) / 100
}

export async function hasAttendanceOnIctDay(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  employeeId: string,
  checkInAt: Date,
  excludeId?: string
): Promise<boolean> {
  const { start, end } = ictDayRangeUtc(checkInAt)
  let query = supabase
    .from("hr_attendance")
    .select("id")
    .eq("employee_id", employeeId)
    .gte("check_in_at", start.toISOString())
    .lt("check_in_at", end.toISOString())
    .limit(1)

  if (excludeId) {
    query = query.neq("id", excludeId)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).length > 0
}
