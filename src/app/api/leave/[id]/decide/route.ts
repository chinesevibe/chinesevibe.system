import { NextResponse, type NextRequest } from "next/server"

import { countLeaveDays, type LeaveType } from "@/features/leave/types"
import { recordPayrollHours } from "@/lib/approval/payroll-ledger"
import {
  getCurrentEmployeeWithBranch,
  canApproveHrRequests,
} from "@/lib/auth/branch"
import {
  leaveApprovedFlex,
  leaveRejectedFlex,
} from "@/lib/line/flex/leave-result"
import { coerceLocale } from "@/lib/i18n/types"
import { pushToLineUser } from "@/lib/line/notify-hr"
import { createClient } from "@/lib/supabase/server"

type DecideBody = {
  action?: "approve" | "reject"
  note?: string
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const caller = await getCurrentEmployeeWithBranch()
  if (!caller) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { id } = await context.params
  let body: DecideBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  if (body.action !== "approve" && body.action !== "reject") {
    return NextResponse.json({ error: "invalid action" }, { status: 400 })
  }

  const note = typeof body.note === "string" ? body.note.trim() : ""
  if (body.action === "reject" && note.length < 3) {
    return NextResponse.json({ error: "reject reason required" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: leave, error: fetchError } = await supabase
    .from("hr_leaves")
    .select(
      "id, employee_id, type, start_date, end_date, reason, status, approval_status, leave_unit, leave_hours, hr_employees!employee_id(line_user_id, name, department, branch_id, preferred_locale)"
    )
    .eq("id", id)
    .maybeSingle()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  if (!leave) return NextResponse.json({ error: "not found" }, { status: 404 })
  if (leave.approval_status === "expired") {
    return NextResponse.json({ error: "คำขอหมดอายุแล้ว" }, { status: 400 })
  }

  const employeeJoin = Array.isArray(leave.hr_employees)
    ? leave.hr_employees[0]
    : leave.hr_employees
  const lineUserId = employeeJoin?.line_user_id as string | null | undefined
  const branchId = (employeeJoin as { branch_id?: string })?.branch_id ?? null
  const locale = coerceLocale(
    (employeeJoin as { preferred_locale?: unknown })?.preferred_locale
  )
  const leaveType = leave.type as LeaveType
  const days = countLeaveDays(leave.start_date, leave.end_date) ?? 0

  const finalizeApprove = async () => {
    const newStatus = "approved"
    const { error: updateError } = await supabase
      .from("hr_leaves")
      .update({
        status: newStatus,
        approval_status: "approved",
        approved_by: caller.id,
        hr_decided_by: caller.id,
        hr_decided_at: new Date().toISOString(),
        decision_note: note || null,
      })
      .eq("id", id)

    if (updateError) throw updateError

    let remainingDays: number | null = null

    if (leave.leave_unit === "days" && days > 0) {
      const { data: balance } = await supabase
        .from("hr_leave_balances")
        .select("used_days, total_days")
        .eq("employee_id", leave.employee_id)
        .eq("leave_type", leave.type)
        .maybeSingle()

      if (balance) {
        const nextUsed = Number(balance.used_days) + days
        await supabase
          .from("hr_leave_balances")
          .update({ used_days: nextUsed })
          .eq("employee_id", leave.employee_id)
          .eq("leave_type", leave.type)
        remainingDays = Number(balance.total_days) - nextUsed
      }
    }

    if (leave.leave_unit === "hours" && leave.leave_hours) {
      await recordPayrollHours({
        employeeId: leave.employee_id as string,
        branchId,
        workDate: leave.start_date as string,
        hours: Number(leave.leave_hours),
        lineType: "sick_hourly",
        sourceType: "leave",
        sourceId: id,
      })
    }

    if (lineUserId) {
      try {
        await pushToLineUser(lineUserId, [
          leaveApprovedFlex({
            type: leaveType,
            startDate: leave.start_date,
            endDate: leave.end_date,
            remainingDays,
            note: note || null,
            locale,
          }),
        ])
      } catch (lineError) {
        console.error("leave decide LINE notify failed:", lineError)
      }
    }

    return { id, status: newStatus }
  }

  const finalizeReject = async (stage: "manager" | "hr") => {
    const patch =
      stage === "manager"
        ? {
            approval_status: "rejected",
            status: "rejected",
            manager_decided_by: caller.id,
            manager_decided_at: new Date().toISOString(),
            decision_note: note,
          }
        : {
            approval_status: "rejected",
            status: "rejected",
            hr_decided_by: caller.id,
            hr_decided_at: new Date().toISOString(),
            decision_note: note,
          }

    const { error } = await supabase.from("hr_leaves").update(patch).eq("id", id)
    if (error) throw error

    if (lineUserId) {
      try {
        await pushToLineUser(lineUserId, [
          leaveRejectedFlex({
            type: leaveType,
            startDate: leave.start_date,
            endDate: leave.end_date,
            reason: note,
            locale,
          }),
        ])
      } catch (lineError) {
        console.error("leave reject LINE notify failed:", lineError)
      }
    }
    return { id, status: "rejected" }
  }

  if (
    leave.approval_status === "pending_hr" ||
    leave.approval_status === "pending_manager"
  ) {
    if (!canApproveHrRequests(caller.role)) {
      return NextResponse.json(
        { error: "เฉพาะ HR Officer เท่านั้นที่อนุมัติลาได้" },
        { status: 403 }
      )
    }

    if (body.action === "reject") {
      try {
        return NextResponse.json(await finalizeReject("hr"))
      } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 })
      }
    }

    try {
      return NextResponse.json(await finalizeApprove())
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 500 })
    }
  }

  return NextResponse.json({ error: "already decided" }, { status: 409 })
}
