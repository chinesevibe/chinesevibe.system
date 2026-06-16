// Check-in business logic — pure DB pipeline, no LINE SDK imports.
// Runs in the webhook context, so writes go through the service-role client
// (no user session); RLS is bypassed by design (T02).
import { getAdminClient } from "@/lib/auth/admin-client"
import { ictDayRangeUtc, lateMinutes } from "@/lib/attendance/late"
import {
  evaluateAttendanceLocation,
  suspiciousLocationMessage,
  type AttendanceLocationInput,
} from "@/lib/attendance/location-security"
import { getWorkStart } from "@/lib/runtime-config"

export type CheckInLocation = AttendanceLocationInput

export type CheckInResult =
  | {
      status: "success"
      employeeName: string
      checkInAt: Date
      lateMinutes: number
    }
  | { status: "already_checked_in"; checkInAt: Date }
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
    .select("id, name, status, branch_id")
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

  const { start, end } = ictDayRangeUtc(now)
  const { data: existing, error: existingError } = await admin
    .from("hr_attendance")
    .select("check_in_at")
    .eq("employee_id", employee.id)
    .gte("check_in_at", start.toISOString())
    .lt("check_in_at", end.toISOString())
    .limit(1)
    .maybeSingle()

  if (existingError) {
    throw existingError
  }
  if (existing) {
    return {
      status: "already_checked_in",
      checkInAt: new Date(existing.check_in_at),
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
  const late = lateMinutes(now, hour, minute)
  const suspicious = locationDecision.status === "suspicious_location"

  const { data: inserted, error: insertError } = await admin.from("hr_attendance").insert({
    employee_id: employee.id,
    check_in_at: now.toISOString(),
    check_in_location: locationDecision.payload,
    is_late: late > 0,
    location_review_status: suspicious ? "pending_hr" : "clear",
    location_review_flags: locationDecision.flags,
    location_review_note: suspicious ? suspiciousLocationMessage(locationDecision.flags) : null,
    location_reviewed_by: null,
    location_reviewed_at: null,
  }).select("id").single()

  if (insertError) {
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

  return {
    status: "success",
    employeeName: employee.name,
    checkInAt: now,
    lateMinutes: late,
  }
}
