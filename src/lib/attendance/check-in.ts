// Check-in business logic — pure DB pipeline, no LINE SDK imports.
// Runs in the webhook context, so writes go through the service-role client
// (no user session); RLS is bypassed by design (T02).
import { getAdminClient } from "@/lib/auth/admin-client"
import { ictDayRangeUtc, lateMinutes } from "@/lib/attendance/late"
import { assertWithinBranchGeofence } from "@/lib/geofence/branch-geofence"
import { getWorkStart } from "@/lib/runtime-config"

export type CheckInLocation = {
  latitude: number
  longitude: number
  address?: string
}

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

  if (employee.branch_id) {
    const geofence = await assertWithinBranchGeofence({
      branchId: employee.branch_id as string,
      latitude: location.latitude,
      longitude: location.longitude,
      admin,
    })
    if (!geofence.ok && geofence.reason === "outside") {
      return {
        status: "outside_geofence",
        distanceM: geofence.distanceM,
        limitM: geofence.limitM,
      }
    }
  }

  const { hour, minute } = await getWorkStart()
  const late = lateMinutes(now, hour, minute)

  const { error: insertError } = await admin.from("hr_attendance").insert({
    employee_id: employee.id,
    check_in_at: now.toISOString(),
    check_in_location: location,
    is_late: late > 0,
  })

  if (insertError) {
    throw insertError
  }

  return {
    status: "success",
    employeeName: employee.name,
    checkInAt: now,
    lateMinutes: late,
  }
}
