// Check-out business logic — pure DB pipeline, no LINE SDK imports.
// Service-role client by design (webhook has no user session, T02).
import { finalizeAttendanceRecord } from "@/lib/attendance/finalize-attendance-record"
import { getAdminClient } from "@/lib/auth/admin-client"
import { ictDayRangeUtc } from "@/lib/attendance/late"
import type { CheckInLocation } from "@/lib/attendance/check-in"
import { ictToday } from "@/lib/datetime/thailand"
import {
  evaluateAttendanceLocation,
  mergeLocationFlags,
  suspiciousLocationMessage,
} from "@/lib/attendance/location-security"
import { computePaidWorkMinutes } from "@/lib/attendance/paid-work-time"

export type CheckOutResult =
  | {
      status: "success"
      employeeName: string
      checkInAt: Date
      checkOutAt: Date
      workMinutes: number
      overtimeMinutes: number
      showWorkDuration: boolean
    }
  | { status: "not_checked_in" }
  | { status: "already_checked_out"; checkOutAt: Date }
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

export async function checkOut({
  lineUserId,
  location,
  now = new Date(),
}: {
  lineUserId: string
  location?: CheckInLocation
  now?: Date
}): Promise<CheckOutResult> {
  const admin = getAdminClient()

  const { data: row, error: employeeError } = await admin
    .from("hr_employees")
    .select(
      "id, name, status, branch_id, pay_type, work_shift_id, default_check_in_time, default_check_out_time"
    )
    .eq("line_user_id", lineUserId)
    .maybeSingle()

  if (employeeError) {
    throw employeeError
  }
  if (!row) {
    return { status: "not_registered" }
  }
  if (row.status !== "active") {
    return { status: "pending_approval" }
  }
  const employee = row

  // Branch Night fix: look back 36 h for an open record first (covers 14:00–02:00 shifts).
  const window36hStart = new Date(now.getTime() - 36 * 60 * 60 * 1000)
  const { data: openRecord, error: openRecordError } = await admin
    .from("hr_attendance")
    .select("id, check_in_at, check_out_at, location_review_status, location_review_flags, shift_date")
    .eq("employee_id", employee.id)
    .is("check_out_at", null)
    .gte("check_in_at", window36hStart.toISOString())
    .order("check_in_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (openRecordError) {
    throw openRecordError
  }

  let record: typeof openRecord
  if (openRecord) {
    record = openRecord
  } else {
    // No open record — fall back to current ICT day to surface already_checked_out.
    const { start, end } = ictDayRangeUtc(now)
    const { data: dayRecord, error: dayRecordError } = await admin
      .from("hr_attendance")
      .select("id, check_in_at, check_out_at, location_review_status, location_review_flags, shift_date")
      .eq("employee_id", employee.id)
      .gte("check_in_at", start.toISOString())
      .lt("check_in_at", end.toISOString())
      .limit(1)
      .maybeSingle()

    if (dayRecordError) {
      throw dayRecordError
    }
    record = dayRecord
  }

  if (!record) {
    return { status: "not_checked_in" }
  }
  if (record.check_out_at) {
    return {
      status: "already_checked_out",
      checkOutAt: new Date(record.check_out_at),
    }
  }

  let suspiciousFlags = mergeLocationFlags(
    (record.location_review_flags as string[] | null) ?? [],
  )
  const reviewStatus = (record.location_review_status as string | null) ?? "clear"
  let nextReviewStatus = reviewStatus
  let hasNewSuspiciousSignal = reviewStatus === "pending_hr"
  let checkoutPayload: Record<string, unknown> | null = null

  if (location) {
    const decision = await evaluateAttendanceLocation({
      employeeId: employee.id as string,
      branchId: (employee.branch_id as string | null) ?? null,
      location,
      now,
    })
    checkoutPayload = decision.payload

    if (decision.status === "outside_geofence") {
      return {
        status: "outside_geofence",
        distanceM: decision.distanceM,
        limitM: decision.limitM,
      }
    }

    suspiciousFlags = mergeLocationFlags(suspiciousFlags, decision.flags)
    if (decision.status === "suspicious_location") {
      hasNewSuspiciousSignal = true
      nextReviewStatus = "pending_hr"
    }
  }

  const checkInAt = new Date(record.check_in_at)
  const workDate = (record.shift_date as string | null) ?? ictToday()

  // Resolve active shift window if employee has a work_shift_id.
  let shiftWindow: import("@/lib/attendance/paid-work-time").PaidWorkShiftWindow | null = null
  if (employee.work_shift_id) {
    const { data: shiftRow } = await admin
      .from("hr_work_shifts")
      .select("start_hour, start_minute, end_hour, end_minute, crosses_midnight, grace_minutes")
      .eq("id", employee.work_shift_id)
      .eq("is_active", true)
      .maybeSingle()
    if (shiftRow) {
      shiftWindow = shiftRow as import("@/lib/attendance/paid-work-time").PaidWorkShiftWindow
    }
  }

  const paidResult = computePaidWorkMinutes({
    workDate,
    shiftDate: workDate,
    checkInAt,
    checkOutAt: now,
    shift: shiftWindow,
    defaultCheckInTime: (employee.default_check_in_time as string | null) ?? undefined,
    defaultCheckOutTime: (employee.default_check_out_time as string | null) ?? undefined,
  })

  const workMinutes = paidResult.paidMinutes
  // Stored as hours with 2 decimals — numeric(5,2) cannot hold minutes.
  const workHours = paidResult.paidHours
  const showWorkDuration = (employee.pay_type as string | null) !== "monthly"

  // Conditional update: a concurrent check-out loses the race and matches 0 rows.
  const { data: updated, error: updateError } = await admin
    .from("hr_attendance")
    .update({
      check_out_at: now.toISOString(),
      work_hours: workHours,
      check_out_location: checkoutPayload,
      location_review_status:
        nextReviewStatus === "rejected"
          ? "rejected"
          : hasNewSuspiciousSignal
            ? "pending_hr"
            : nextReviewStatus,
      location_review_flags: suspiciousFlags,
      location_review_note:
        hasNewSuspiciousSignal ? suspiciousLocationMessage(suspiciousFlags) : undefined,
      location_reviewed_by: hasNewSuspiciousSignal ? null : undefined,
      location_reviewed_at: hasNewSuspiciousSignal ? null : undefined,
    })
    .eq("id", record.id)
    .is("check_out_at", null)
    .select("id")

  if (updateError) {
    throw updateError
  }
  if (!updated || updated.length === 0) {
    return { status: "already_checked_out", checkOutAt: now }
  }

  const finalizeResult = await finalizeAttendanceRecord({
    attendanceId: record.id as string,
    employeeId: employee.id as string,
    branchId: (employee.branch_id as string | null) ?? null,
    workDate,
    workHours,
    now,
  })

  if (hasNewSuspiciousSignal || finalizeResult.status === "pending_location_review") {
    if (hasNewSuspiciousSignal) {
      const { notifyAttendanceLocationReview } = await import(
        "@/lib/line/notify-attendance-location"
      )
      void notifyAttendanceLocationReview(record.id as string).catch((err) => {
        console.error("check-out HR notify failed:", err)
      })
    }
    return {
      status: "suspicious_location",
      flags: suspiciousFlags,
      message: suspiciousLocationMessage(suspiciousFlags),
    }
  }

  return {
    status: "success",
    employeeName: employee.name,
    checkInAt,
    checkOutAt: now,
    workMinutes,
    overtimeMinutes: 0,
    showWorkDuration,
  }
}
