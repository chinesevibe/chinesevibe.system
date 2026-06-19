import { NextResponse } from "next/server"

import { getCurrentEmployee } from "@/lib/auth/session"
import { getAdminClient } from "@/lib/auth/admin-client"
import { ictDayRangeUtc } from "@/lib/attendance/late"

function fmtTime(h: number, m: number) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export async function GET() {
  const employee = await getCurrentEmployee()
  if (!employee || employee.status !== "active") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const admin = getAdminClient()

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
  const { start, end } = ictDayRangeUtc(now)

  const { data: att } = await admin
    .from("hr_attendance")
    .select("check_in_at, check_out_at")
    .eq("employee_id", employee.id)
    .gte("check_in_at", start.toISOString())
    .lt("check_in_at", end.toISOString())
    .order("check_in_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const checkInAt = att?.check_in_at ? new Date(att.check_in_at as string).toISOString() : null
  const checkOutAt = att?.check_out_at ? new Date(att.check_out_at as string).toISOString() : null

  return NextResponse.json({
    employeeId: employee.id,
    employeeName: employee.name,
    ...branchInfo,
    shift: shiftInfo,
    checkInAt,
    checkOutAt,
  })
}
