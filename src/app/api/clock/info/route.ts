import { NextResponse } from "next/server"

import {
  autoCloseOpenAttendanceSessions,
  isCheckoutStillInActiveCycle,
  sessionCycleStartUtc,
} from "@/lib/attendance/session-cycle"
import { getCurrentEmployee } from "@/lib/auth/session"
import { getAdminClient } from "@/lib/auth/admin-client"

function fmtTime(h: number, m: number) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export async function GET() {
  const employee = await getCurrentEmployee()
  if (!employee || employee.status !== "active") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const admin = getAdminClient()
  const { data: employeeSchedule } = await admin
    .from("hr_employees")
    .select("default_check_in_time")
    .eq("id", employee.id)
    .maybeSingle()

  // ── Branch / geofence ──────────────────────────────────────────────────
  let branchInfo: {
    branchName: string | null
    latitude: number | null
    longitude: number | null
    geofenceRadiusM: number
    geofenceEnabled: boolean
  } = { branchName: null, latitude: null, longitude: null, geofenceRadiusM: 100, geofenceEnabled: true }

  if (employee.branch_id) {
    const { data: branch } = await admin
      .from("hr_branches")
      .select("name, latitude, longitude, geofence_radius_m, geofence_enabled")
      .eq("id", employee.branch_id)
      .maybeSingle()

    if (branch?.latitude && branch?.longitude) {
      branchInfo = {
        branchName: (branch.name as string | null) ?? null,
        latitude: Number(branch.latitude),
        longitude: Number(branch.longitude),
        geofenceRadiusM: (branch.geofence_radius_m as number | null) ?? 100,
        geofenceEnabled: (branch.geofence_enabled as boolean | null) ?? true,
      }
    }
  }

  // ── Shift ──────────────────────────────────────────────────────────────
  type ShiftRow = {
    name: string; start_hour: number; start_minute: number
    end_hour: number; end_minute: number; crosses_midnight: boolean
  }
  let shiftInfo: (ShiftRow & { label: string }) | null = null

  if (employee.work_shift_id) {
    const { data: shift } = await admin
      .from("hr_work_shifts")
      .select("name, start_hour, start_minute, end_hour, end_minute, crosses_midnight")
      .eq("id", employee.work_shift_id)
      .eq("is_active", true)
      .maybeSingle()

    if (shift) {
      const s = shift as ShiftRow
      shiftInfo = {
        ...s,
        label: `${fmtTime(s.start_hour, s.start_minute)} – ${fmtTime(s.end_hour, s.end_minute)}`,
      }
    }
  }

  // ── Today's attendance ─────────────────────────────────────────────────
  const now = new Date()
  await autoCloseOpenAttendanceSessions({
    admin,
    employeeId: employee.id as string,
    now,
  })

  const { data: openRecord } = await admin
    .from("hr_attendance")
    .select("check_in_at, check_out_at")
    .eq("employee_id", employee.id)
    .is("check_out_at", null)
    .order("check_in_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  let checkInAt: string | null = null
  let checkOutAt: string | null = null
  if (openRecord) {
    checkInAt = openRecord.check_in_at ? new Date(openRecord.check_in_at as string).toISOString() : null
    checkOutAt = openRecord.check_out_at ? new Date(openRecord.check_out_at as string).toISOString() : null
  }

  if (!openRecord) {
    const cycleStart = sessionCycleStartUtc(
      now,
      (employeeSchedule?.default_check_in_time as string | null) ?? null
    )

    const { data: att } = await admin
      .from("hr_attendance")
      .select("check_in_at, check_out_at")
      .eq("employee_id", employee.id)
      .gte("check_in_at", cycleStart.toISOString())
      .lte("check_in_at", now.toISOString())
      .order("check_in_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (att?.check_in_at) {
      const nextCheckInAt = new Date(att.check_in_at as string).toISOString()
      const nextCheckOutAt = att.check_out_at ? new Date(att.check_out_at as string) : null
      if (!nextCheckOutAt || isCheckoutStillInActiveCycle(nextCheckOutAt, now)) {
        checkInAt = nextCheckInAt
        checkOutAt = nextCheckOutAt ? nextCheckOutAt.toISOString() : null
      }
    }
  }

  return NextResponse.json({
    employeeId: employee.id,
    employeeName: employee.name,
    ...branchInfo,
    shift: shiftInfo,
    checkInAt,
    checkOutAt,
  })
}
