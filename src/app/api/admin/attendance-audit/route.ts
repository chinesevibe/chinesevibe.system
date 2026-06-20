// GET /api/admin/attendance-audit
// Audits branch night employee shift assignments and recent attendance records.
// Shows what shiftSessionWindowStart computes for each employee right now.
import { NextResponse } from "next/server"

import { getAdminClient } from "@/lib/auth/admin-client"
import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000

function shiftSessionWindowStart(now: Date, startHour: number, startMinute: number): Date {
  const ictNowMs = now.getTime() + ICT_OFFSET_MS
  const ictDayStartMs = Math.floor(ictNowMs / 86_400_000) * 86_400_000
  const shiftStartMsToday = ictDayStartMs + (startHour * 60 + startMinute) * 60_000
  if (ictNowMs >= shiftStartMsToday) {
    return new Date(shiftStartMsToday - ICT_OFFSET_MS)
  }
  return new Date(shiftStartMsToday - 86_400_000 - ICT_OFFSET_MS)
}

function ictMidnight(now: Date): Date {
  const ictNowMs = now.getTime() + ICT_OFFSET_MS
  const ictDayStartMs = Math.floor(ictNowMs / 86_400_000) * 86_400_000
  return new Date(ictDayStartMs - ICT_OFFSET_MS)
}

function toIct(utcDate: string | null): string {
  if (!utcDate) return "-"
  const d = new Date(utcDate)
  const ict = new Date(d.getTime() + ICT_OFFSET_MS)
  return ict.toISOString().replace("T", " ").slice(0, 16) + " ICT"
}

export async function GET() {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const admin = getAdminClient()
  const now = new Date()

  // 1. All work shifts
  const { data: shifts } = await admin
    .from("hr_work_shifts")
    .select("id, code, name, start_hour, start_minute, end_hour, end_minute, crosses_midnight, is_active")
    .order("start_hour")

  // 2. All active employees + their shift assignment
  const { data: employees } = await admin
    .from("hr_employees")
    .select("id, employee_code, name, work_shift_id, status")
    .eq("status", "active")
    .order("employee_code")

  const shiftMap = new Map((shifts ?? []).map((s) => [s.id, s]))

  // 3. Last 48h attendance per employee (to see phantom records)
  const window48h = new Date(now.getTime() - 48 * 60 * 60 * 1000)
  const { data: recentAttendance } = await admin
    .from("hr_attendance")
    .select("employee_id, check_in_at, check_out_at, work_shift_id")
    .gte("check_in_at", window48h.toISOString())
    .order("check_in_at", { ascending: false })

  const attendanceByEmployee = new Map<string, typeof recentAttendance>()
  for (const rec of recentAttendance ?? []) {
    const eid = rec.employee_id as string
    if (!attendanceByEmployee.has(eid)) attendanceByEmployee.set(eid, [])
    attendanceByEmployee.get(eid)!.push(rec)
  }

  const employeeAudit = (employees ?? []).map((emp) => {
    const shift = emp.work_shift_id ? shiftMap.get(emp.work_shift_id as string) : null
    let sessionWindowStartStr = "-"
    let sessionWindowStartUtc = "-"
    let issue: string | null = null

    if (shift && shift.is_active) {
      const ws = shiftSessionWindowStart(now, shift.start_hour as number, shift.start_minute as number)
      sessionWindowStartStr = toIct(ws.toISOString())
      sessionWindowStartUtc = ws.toISOString()
    } else if (!shift && emp.work_shift_id) {
      issue = "work_shift_id set but shift not found or is_active=false"
      const midnight = ictMidnight(now)
      sessionWindowStartStr = `ICT midnight fallback: ${toIct(midnight.toISOString())}`
      sessionWindowStartUtc = midnight.toISOString()
    } else {
      // No shift assigned — ICT midnight fallback
      const midnight = ictMidnight(now)
      sessionWindowStartStr = `ICT midnight fallback (no shift): ${toIct(midnight.toISOString())}`
      sessionWindowStartUtc = midnight.toISOString()
      if (!emp.work_shift_id) issue = "no work_shift_id assigned"
    }

    const records = (attendanceByEmployee.get(emp.id as string) ?? []).map((r) => {
      const checkIn = new Date(r.check_in_at as string)
      const isInWindow = sessionWindowStartUtc !== "-" && checkIn >= new Date(sessionWindowStartUtc)
      return {
        check_in_at_ict: toIct(r.check_in_at as string),
        check_out_at_ict: toIct(r.check_out_at as string | null),
        open: !r.check_out_at,
        in_session_window: isInWindow,
        would_block_checkin: isInWindow && !!r.check_out_at,
      }
    })

    const blocking = records.filter((r) => r.would_block_checkin)

    return {
      employee_code: emp.employee_code,
      name: emp.name,
      shift: shift ? `${shift.code} (${shift.name}) start=${shift.start_hour}:${String(shift.start_minute).padStart(2, "0")} crosses_midnight=${shift.crosses_midnight} is_active=${shift.is_active}` : null,
      work_shift_id: emp.work_shift_id ?? null,
      session_window_start: sessionWindowStartStr,
      issue,
      recent_records_48h: records,
      blocking_records: blocking,
    }
  })

  const ictNow = new Date(now.getTime() + ICT_OFFSET_MS)

  return NextResponse.json({
    audit_at: `${ictNow.toISOString().replace("T", " ").slice(0, 19)} ICT`,
    audit_at_utc: now.toISOString(),
    shifts: (shifts ?? []).map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      start: `${s.start_hour}:${String(s.start_minute).padStart(2, "0")}`,
      end: `${s.end_hour}:${String(s.end_minute).padStart(2, "0")}`,
      crosses_midnight: s.crosses_midnight,
      is_active: s.is_active,
    })),
    employees: employeeAudit,
    summary: {
      total_employees: employeeAudit.length,
      no_shift_assigned: employeeAudit.filter((e) => !e.work_shift_id).length,
      has_blocking_records: employeeAudit.filter((e) => e.blocking_records.length > 0).map((e) => e.name),
      has_issues: employeeAudit.filter((e) => e.issue).map((e) => `${e.name}: ${e.issue}`),
    },
  })
}
