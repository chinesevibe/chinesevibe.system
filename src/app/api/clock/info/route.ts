import { NextResponse } from "next/server"

import { autoCloseOpenAttendanceSessions } from "@/lib/attendance/session-cycle"
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

  // ── Current session ────────────────────────────────────────────────────
  // Pure session model: open record = active session; no ICT-day window.
  // Auto-close stale open records older than 24h (forgot to check out).
  const now = new Date()
  await autoCloseOpenAttendanceSessions({
    admin,
    employeeId: employee.id as string,
    now,
  })

  // Return the most recent record: open session, or a recently closed one
  // (so the employee can see their completed session on the LIFF clock page).
  const DISPLAY_WINDOW_MS = 2 * 60 * 60 * 1000 // 2h after checkout
  const displaySince = new Date(now.getTime() - DISPLAY_WINDOW_MS)

  const { data: recentRecord } = await admin
    .from("hr_attendance")
    .select("check_in_at, check_out_at")
    .eq("employee_id", employee.id)
    .or(`check_out_at.is.null,check_out_at.gte.${displaySince.toISOString()}`)
    .order("check_in_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  let checkInAt: string | null = null
  let checkOutAt: string | null = null
  if (recentRecord?.check_in_at) {
    checkInAt = new Date(recentRecord.check_in_at as string).toISOString()
    checkOutAt = recentRecord.check_out_at
      ? new Date(recentRecord.check_out_at as string).toISOString()
      : null
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
