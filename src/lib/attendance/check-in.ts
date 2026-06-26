// Check-in business logic — pure DB pipeline, no LINE SDK imports.
// Runs in the webhook context, so writes go through the service-role client
// (no user session); RLS is bypassed by design (T02).
import { getAdminClient } from "@/lib/auth/admin-client"
import { ictDateFromUtc } from "@/lib/attendance/ict-datetime"
import { lateMinutesAtCheckIn } from "@/lib/attendance/late"
import { shouldPushClockReceipt } from "@/lib/attendance/clock-notify-policy"
import {
  evaluateAttendanceLocation,
  suspiciousLocationMessage,
  type AttendanceLocationInput,
} from "@/lib/attendance/location-security"
import {
  autoCloseOpenAttendanceSessions,
  isMissingCheckoutRecord,
  isRecheckinBlockedAfterCheckout,
  recheckinAvailableAt,
  sessionCutoffUtcForCheckIn,
} from "@/lib/attendance/session-cycle"
import { getWorkStart } from "@/lib/runtime-config"
import {
  getAttendanceMonthSummary,
  type AttendanceMonthSummary,
} from "@/lib/attendance/month-summary"

export type CheckInLocation = AttendanceLocationInput

export type CheckInResult =
  | {
      status: "success"
      employeeName: string
      checkInAt: Date
      lateMinutes: number
      monthSummary: AttendanceMonthSummary
      lineNotified: boolean
    }
  | { status: "already_checked_in"; checkInAt: Date }
  | { status: "requires_retro_checkout"; checkInAt: Date; cutoffAt: Date }
  | { status: "too_soon_after_checkout"; nextCheckInAt: Date }
  | {
      status: "outside_geofence"
      distanceM: number
      limitM: number
    }
  | {
      status: "suspicious_location"
      flags: string[]
      message: string
    }
  | { status: "pending_approval" }
  | { status: "not_registered" }
  | { status: "on_leave"; endDate: string }

export async function checkIn({
  lineUserId,
  location,
  now = new Date(),
}: {
  lineUserId: string
  location: CheckInLocation
  now?: Date
}): Promise<CheckInResult> {
  const admin = getAdminClient()

  const { data: row, error: employeeError } = await admin
    .from("hr_employees")
    .select("id, name, status, branch_id, default_check_in_time, preferred_locale")
    .eq("line_user_id", lineUserId)
    .maybeSingle()

  if (employeeError) throw employeeError
  if (!row) return { status: "not_registered" }
  if (row.status !== "active") return { status: "pending_approval" }

  const employee = row

  // Block check-in if employee has an approved leave covering today (ICT)
  const todayIct = ictDateFromUtc(now)
  const { data: activeLeave } = await admin
    .from("hr_leaves")
    .select("end_date")
    .eq("employee_id", employee.id)
    .eq("status", "approved")
    .lte("start_date", todayIct)
    .gte("end_date", todayIct)
    .limit(1)
    .maybeSingle()

  if (activeLeave) {
    return { status: "on_leave", endDate: activeLeave.end_date as string }
  }

  await autoCloseOpenAttendanceSessions({
    admin,
    employeeId: employee.id as string,
    now,
  })

  const { data: openRecord, error: openRecordError } = await admin
    .from("hr_attendance")
    .select("check_in_at, location_review_flags")
    .eq("employee_id", employee.id)
    .is("check_out_at", null)
    .order("check_in_at", { ascending: false })
    .limit(5)

  if (openRecordError) throw openRecordError
  const activeOpenRecord = (openRecord ?? []).find(
    (record) =>
      !isMissingCheckoutRecord(record.location_review_flags as string[] | null | undefined)
  )
  if (activeOpenRecord) {
    const checkInAt = new Date(activeOpenRecord.check_in_at)
    return {
      status: "requires_retro_checkout",
      checkInAt,
      cutoffAt: sessionCutoffUtcForCheckIn(checkInAt),
    }
  }

  const { data: recentCheckout, error: recentCheckoutError } = await admin
    .from("hr_attendance")
    .select("check_out_at")
    .eq("employee_id", employee.id)
    .not("check_out_at", "is", null)
    .order("check_out_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (recentCheckoutError) throw recentCheckoutError
  if (recentCheckout?.check_out_at) {
    const checkOutAt = new Date(recentCheckout.check_out_at)
    if (isRecheckinBlockedAfterCheckout(checkOutAt, now)) {
      return {
        status: "too_soon_after_checkout",
        nextCheckInAt: recheckinAvailableAt(checkOutAt),
      }
    }
  }

  const locationDecision = await evaluateAttendanceLocation({
    employeeId: employee.id as string,
    branchId: (employee.branch_id as string | null) ?? null,
    location,
    now,
  })

  if (locationDecision.status === "outside_geofence") {
    return {
      status: "outside_geofence",
      distanceM: locationDecision.distanceM,
      limitM: locationDecision.limitM,
    }
  }

  const { hour, minute } = await getWorkStart()
  const late = lateMinutesAtCheckIn(
    now,
    null,
    { hour, minute },
    employee.default_check_in_time as string | null
  )
  const suspicious = locationDecision.status === "suspicious_location"

  const { data: inserted, error: insertError } = await admin
    .from("hr_attendance")
    .insert({
      employee_id: employee.id,
      check_in_at: now.toISOString(),
      check_in_location: locationDecision.payload,
      is_late: late > 0,
      work_shift_id: null,
      shift_date: ictDateFromUtc(now),
      location_review_status: suspicious ? "pending_hr" : "clear",
      location_review_flags: locationDecision.flags,
      location_review_note: suspicious ? suspiciousLocationMessage(locationDecision.flags) : null,
      location_reviewed_by: null,
      location_reviewed_at: null,
    })
    .select("id")
    .single()

  if (insertError) {
    if (String(insertError.message ?? "").includes("open attendance record")) {
      const { data: currentOpen, error: currentOpenError } = await admin
        .from("hr_attendance")
        .select("check_in_at, location_review_flags")
        .eq("employee_id", employee.id)
        .is("check_out_at", null)
        .order("check_in_at", { ascending: false })
        .limit(5)

      if (currentOpenError) throw currentOpenError
      const currentActiveOpen = (currentOpen ?? []).find(
        (record) =>
          !isMissingCheckoutRecord(record.location_review_flags as string[] | null | undefined)
      )
      if (currentActiveOpen) {
        const checkInAt = new Date(currentActiveOpen.check_in_at)
        return {
          status: "requires_retro_checkout",
          checkInAt,
          cutoffAt: sessionCutoffUtcForCheckIn(checkInAt),
        }
      }
    }
    throw insertError
  }

  if (suspicious && inserted?.id) {
    const { notifyAttendanceLocationReview } = await import(
      "@/lib/line/notify-attendance-location"
    )
    void notifyAttendanceLocationReview(inserted.id as string).catch((err) => {
      console.error("check-in HR notify failed:", err)
    })
    return {
      status: "suspicious_location",
      flags: locationDecision.flags,
      message: suspiciousLocationMessage(locationDecision.flags),
    }
  }

  const monthSummary = await getAttendanceMonthSummary(employee.id as string, now)
  const shouldPushReceipt = shouldPushClockReceipt(location.source)
  let lineNotified = !shouldPushReceipt
  if (shouldPushReceipt) {
    try {
      const { notifyCheckin } = await import("@/lib/line/notify-clock")
      await notifyCheckin({
        lineUserId,
        name: employee.name,
        checkInAt: now,
        lateMinutes: late,
        monthSummary,
        locale: employee.preferred_locale as string | null,
      })
      lineNotified = true
    } catch (err) {
      console.error("notify checkin failed:", err)
    }
  }

  return {
    status: "success",
    employeeName: employee.name,
    checkInAt: now,
    lateMinutes: late,
    monthSummary,
    lineNotified,
  }
}
