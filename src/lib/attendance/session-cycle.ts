import { getAdminClient } from "@/lib/auth/admin-client"

export const MISSING_CHECKOUT_FLAG = "missing_checkout"

// Stale-session window: mark any unclosed record older than 24h as missing checkout.
const STALE_SESSION_MS = 24 * 60 * 60 * 1000

// Display window: show a completed session on UI for 2h after checkout.
const SESSION_DISPLAY_MS = 2 * 60 * 60 * 1000

// Cooldown window: prevent a new check-in too soon after a completed checkout.
const RECHECKIN_GAP_MS = 8 * 60 * 60 * 1000

/**
 * Start of the "current session query window" = now - 24h rolling.
 * Pure session model: no ICT-day boundary, second param ignored.
 */
export function sessionCycleStartUtc(now: Date): Date {
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
  location_review_flags: string[] | null
  location_review_note: string | null
}

export function sessionCutoffUtcForCheckIn(checkInAt: Date): Date {
  return new Date(checkInAt.getTime() + STALE_SESSION_MS)
}

export function hasAttendanceFlag(
  flags: string[] | null | undefined,
  flag: string
): boolean {
  return Array.isArray(flags) && flags.includes(flag)
}

export function isMissingCheckoutRecord(
  flags: string[] | null | undefined
): boolean {
  return hasAttendanceFlag(flags, MISSING_CHECKOUT_FLAG)
}

export async function autoCloseOpenAttendanceSessions({
  admin = getAdminClient(),
  employeeId,
  now = new Date(),
}: {
  admin?: AdminClient
  employeeId?: string
  now?: Date
}): Promise<{ markedCount: number }> {
  let query = admin
    .from("hr_attendance")
    .select("id, employee_id, check_in_at, shift_date, location_review_flags, location_review_note")
    .is("check_out_at", null)

  if (employeeId) {
    query = query.eq("employee_id", employeeId)
  }

  const { data, error } = await query.order("check_in_at", { ascending: true })
  if (error) throw error

  const rows = ((data ?? []) as OpenAttendanceRow[]).filter((row) => {
    if (isMissingCheckoutRecord(row.location_review_flags)) return false
    const checkInAt = new Date(row.check_in_at)
    return (
      !Number.isNaN(checkInAt.getTime()) &&
      sessionCutoffUtcForCheckIn(checkInAt).getTime() <= now.getTime()
    )
  })

  if (rows.length === 0) {
    return { markedCount: 0 }
  }

  let markedCount = 0

  for (const row of rows) {
    const nextFlags = Array.from(
      new Set([...(row.location_review_flags ?? []), MISSING_CHECKOUT_FLAG])
    )
    const nextNote =
      row.location_review_note && row.location_review_note.trim().length > 0
        ? row.location_review_note
        : "Missing checkout after 06:00 cutoff"

    const { data: updatedRows, error: updateError } = await admin
      .from("hr_attendance")
      .update({
        location_review_flags: nextFlags,
        location_review_note: nextNote,
      })
      .eq("id", row.id)
      .is("check_out_at", null)
      .select("id")

    if (updateError) throw updateError
    if (!updatedRows || updatedRows.length === 0) continue

    markedCount += 1
  }

  return { markedCount }
}
