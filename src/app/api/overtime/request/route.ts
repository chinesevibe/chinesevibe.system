import { NextResponse, type NextRequest } from "next/server"

import { expiresAtFrom } from "@/lib/approval/types"
import {
  getCurrentEmployeeWithBranch,
  getManagedBranchId,
  isBranchManager,
} from "@/lib/auth/branch"
import { getCurrentEmployee } from "@/lib/auth/session"
import {
  overtimeSubmitConfirmFlex,
  overtimeSubmitHrNotifyFlex,
} from "@/lib/line/flex/overtime-request"
import { coerceLocale, type AppLocale } from "@/lib/i18n/types"
import { notifyHr, pushToLineUser, type NotifyHrResult } from "@/lib/line/notify-hr"
import { roundPayrollHours } from "@/lib/payroll/hour-policy"
import { createClient } from "@/lib/supabase/server"

function otHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number)
  const [eh, em] = endTime.split(":").map(Number)
  return roundPayrollHours(Math.max(0, eh + em / 60 - (sh + sm / 60)))
}

export async function POST(request: NextRequest) {
  let body: {
    employeeId?: string
    workDate?: string
    startTime?: string
    endTime?: string
    reason?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const workDate = body.workDate
  const startTime = body.startTime
  const endTime = body.endTime
  const reason = typeof body.reason === "string" ? body.reason.trim() : ""

  if (
    typeof workDate !== "string" ||
    typeof startTime !== "string" ||
    typeof endTime !== "string" ||
    reason.length < 5 ||
    endTime <= startTime
  ) {
    return NextResponse.json({ error: "invalid fields" }, { status: 400 })
  }

  const otWorkDate: string = workDate
  const otStartTime: string = startTime
  const otEndTime: string = endTime

  const caller = await getCurrentEmployee()
  if (!caller || caller.status !== "active") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const supabase = await createClient()
  const submittedAt = new Date()
  const activeCaller = caller

  const employeeId =
    typeof body.employeeId === "string" ? body.employeeId.trim() : undefined
  const isProxySubmit =
    Boolean(employeeId && employeeId !== activeCaller.id) &&
    isBranchManager(activeCaller.role)

  async function insertSelfRequest(
    submitterId: string,
    submitterName: string,
    submitterDepartment: string | null,
    lineUserId: string | null,
    submitterLocale: AppLocale
  ) {
    const { data: row, error } = await supabase
      .from("hr_overtime_requests")
      .insert({
        employee_id: submitterId,
        work_date: otWorkDate,
        start_time: otStartTime,
        end_time: otEndTime,
        reason,
        status: "pending",
        approval_status: "pending_hr",
        submitted_by: activeCaller.id,
        submitted_at: submittedAt.toISOString(),
        expires_at: expiresAtFrom(submittedAt).toISOString(),
      })
      .select("id")
      .single()

    if (error || !row) {
      return NextResponse.json(
        { error: error?.message ?? "insert failed" },
        { status: 500 }
      )
    }

    let lineNotify: NotifyHrResult | undefined

    try {
      if (lineUserId) {
        await pushToLineUser(lineUserId, [
          overtimeSubmitConfirmFlex({
            employeeName: submitterName,
            workDate: otWorkDate,
            startTime: otStartTime,
            endTime: otEndTime,
            stage: "hr",
            locale: submitterLocale,
          }),
        ])
      }
      lineNotify = await notifyHr([
        overtimeSubmitHrNotifyFlex({
          otId: row.id,
          employeeName: submitterName,
          department: submitterDepartment,
          workDate: otWorkDate,
          startTime: otStartTime,
          endTime: otEndTime,
          reason,
          locale: submitterLocale,
        }),
      ])
    } catch (lineError) {
      console.error("overtime LINE notify failed:", lineError)
    }

    return NextResponse.json({
      id: row.id,
      approval_status: "pending_hr",
      hours: otHours(otStartTime, otEndTime),
      lineNotify,
    })
  }

  // Self-submit (LIFF / portal) — any active role including dev, hr, branch_manager
  if (!isProxySubmit) {
    return insertSelfRequest(
      activeCaller.id,
      activeCaller.name,
      activeCaller.department,
      activeCaller.line_user_id,
      activeCaller.preferred_locale
    )
  }

  // Branch manager proxy submit → skip BM step → pending_hr
  const callerWithBranch = await getCurrentEmployeeWithBranch()
  if (!callerWithBranch || !isBranchManager(callerWithBranch.role)) {
    return NextResponse.json(
      { error: "ไม่มีสิทธิ์ยื่น OT แทนพนักงานคนอื่น" },
      { status: 403 }
    )
  }

  if (!employeeId) {
    return NextResponse.json({ error: "employeeId required" }, { status: 400 })
  }

  const managedBranch = await getManagedBranchId(callerWithBranch.id)
  if (!managedBranch) {
    return NextResponse.json({ error: "ไม่พบสาขาที่ดูแล" }, { status: 400 })
  }

  const { data: target } = await supabase
    .from("hr_employees")
    .select("id, name, line_user_id, branch_id, department, preferred_locale")
    .eq("id", employeeId)
    .maybeSingle()

  if (!target || target.branch_id !== managedBranch) {
    return NextResponse.json({ error: "พนักงานไม่อยู่ในสาขาที่ดูแล" }, { status: 403 })
  }
  const targetLocale = coerceLocale(target.preferred_locale)

  const { data: row, error } = await supabase
    .from("hr_overtime_requests")
    .insert({
      employee_id: employeeId,
      work_date: workDate,
      start_time: startTime,
      end_time: endTime,
      reason,
      status: "pending",
      approval_status: "pending_hr",
      submitted_by: callerWithBranch.id,
      submitted_at: submittedAt.toISOString(),
      expires_at: expiresAtFrom(submittedAt).toISOString(),
      manager_decided_by: callerWithBranch.id,
      manager_decided_at: submittedAt.toISOString(),
    })
    .select("id")
    .single()

  if (error || !row) {
    return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 })
  }

  let lineNotify: NotifyHrResult | undefined

  try {
    if (target.line_user_id) {
      await pushToLineUser(target.line_user_id as string, [
        overtimeSubmitConfirmFlex({
          employeeName: target.name as string,
          workDate,
          startTime,
          endTime,
          stage: "hr",
          locale: targetLocale,
        }),
      ])
    }
    lineNotify = await notifyHr([
      overtimeSubmitHrNotifyFlex({
        otId: row.id,
        employeeName: target.name as string,
        department: (target.department as string) ?? "—",
        workDate,
        startTime,
        endTime,
        reason,
        locale: targetLocale,
      }),
    ])
  } catch (lineError) {
    console.error("overtime LINE notify failed:", lineError)
  }

  return NextResponse.json({
    id: row.id,
    approval_status: "pending_hr",
    hours: otHours(startTime, endTime),
    lineNotify,
  })
}
