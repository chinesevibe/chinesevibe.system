// Check-out business logic — pure DB pipeline, no LINE SDK imports.
// Service-role client by design (webhook has no user session, T02).
import { finalizeAttendanceRecord } from "@/lib/attendance/finalize-attendance-record"
import { getAdminClient } from "@/lib/auth/admin-client"
import type { CheckInLocation } from "@/lib/attendance/check-in"
import { ictDateFromUtc } from "@/lib/attendance/ict-datetime"
import {
  evaluateAttendanceLocation,
  mergeLocationFlags,
  suspiciousLocationMessage,
} from "@/lib/attendance/location-security"
import { computePaidWorkMinutes } from "@/lib/attendance/paid-work-time"
import {
  autoCloseOpenAttendanceSessions,
  sessionCycleStartUtc,
} from "@/lib/attendance/session-cycle"

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
    .select("id, name, status, branch_id, pay_type")
    .eq("line_user_id", lineUserId)
    .maybeSingle()

  if (employeeError) throw employeeError
  if (!row) return { status: "not_registered" }
  if (row.status !== "active") return { status: "pending_approval" }

  const employee = row

  await autoCloseOpenAttendanceSessions({
    admin,
    employeeId: employee.id as string,
    now,
  })

  const { data: openRecord, error: openRecordError } = await admin
    .from("hr_attendance")
    .select("id, check_in_at, check_out_at, location_review_status, location_review_flags, shift_date")
    .eq("employee_id", employee.id)
    .is("check_out_at", null)
    .order("check_in_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (openRecordError) throw openRecordError

  let record: typeof openRecord = openRecord
  if (!record) {
    const cycleStart = sessionCycleStartUtc(now)
    const { data: cycleRecord, error: cycleRecordError } = await admin
      .from("hr_attendance")
      .select("id, check_in_at, check_out_at, location_review_status, location_review_flags, shift_date")
      .eq("employee_id", employee.id)
      .gte("check_in_at", cycleStart.toISOString())
      .lte("check_in_at", now.toISOString())
      .order("check_in_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cycleRecordError) throw cycleRecordError
    record = cycleRecord
  }

  if (!record) return { status: "not_checked_in" }
  if (record.check_out_at) {
    return {
      status: "already_checked_out",
      checkOutAt: new Date(record.check_out_at),
    }
  }

  let suspiciousFlags = mergeLocationFlags((record.location_review_flags as string[] | null) ?? [])
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
  const workDate = (record.shift_date as string | null) ?? ictDateFromUtc(checkInAt)
  const paidResult = computePaidWorkMinutes({
    checkInAt,
    checkOutAt: now,
    shift: null,
  })

  const workMinutes = paidResult.paidMinutes
  const workHours = paidResult.paidHours
  const showWorkDuration = (employee.pay_type as string | null) !== "monthly"

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

  if (updateError) throw updateError
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
