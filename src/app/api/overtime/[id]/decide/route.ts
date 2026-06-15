import { NextResponse, type NextRequest } from "next/server"

import { recordPayrollHours } from "@/lib/approval/payroll-ledger"
import {
  getCurrentEmployeeWithBranch,
  canApproveHrRequests,
} from "@/lib/auth/branch"
import { coerceLocale } from "@/lib/i18n/types"
import { overtimeResultFlex } from "@/lib/line/flex/overtime-request"
import { pushToLineUser } from "@/lib/line/notify-hr"
import { createClient } from "@/lib/supabase/server"

type DecideBody = {
  action?: "approve" | "reject"
  note?: string
}

function otHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number)
  const [eh, em] = endTime.split(":").map(Number)
  return Math.max(0, eh + em / 60 - (sh + sm / 60))
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
  const { data: ot, error: fetchError } = await supabase
    .from("hr_overtime_requests")
    .select(
      "id, work_date, start_time, end_time, reason, status, approval_status, employee_id, hr_employees!employee_id(line_user_id, name, branch_id, department, preferred_locale)"
    )
    .eq("id", id)
    .maybeSingle()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  if (!ot) return NextResponse.json({ error: "not found" }, { status: 404 })
  if (ot.approval_status === "expired") {
    return NextResponse.json({ error: "คำขอหมดอายุแล้ว" }, { status: 400 })
  }

  type Emp = {
    line_user_id: string | null
    name: string
    branch_id: string | null
    department: string | null
    preferred_locale?: unknown
  }
  const empRaw = ot.hr_employees as Emp | Emp[]
  const emp = Array.isArray(empRaw) ? empRaw[0] : empRaw
  const lineUserId = emp?.line_user_id
  const branchId = emp?.branch_id ?? null
  const locale = coerceLocale(emp?.preferred_locale)

  const notifyEmployee = async (approved: boolean) => {
    if (!lineUserId) return
    try {
      await pushToLineUser(lineUserId, [
        overtimeResultFlex({
          workDate: ot.work_date as string,
          approved,
          note: note || undefined,
          locale,
        }),
      ])
    } catch (lineError) {
      console.error("overtime decide LINE notify failed:", lineError)
    }
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

    const { error } = await supabase.from("hr_overtime_requests").update(patch).eq("id", id)
    if (error) throw error
    await notifyEmployee(false)
    return { id, status: "rejected" }
  }

  const finalizeApprove = async () => {
    const { error: updateError } = await supabase
      .from("hr_overtime_requests")
      .update({
        status: "approved",
        approval_status: "approved",
        decision_note: note || null,
        hr_decided_by: caller.id,
        hr_decided_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (updateError) throw updateError

    const hours = otHours(String(ot.start_time), String(ot.end_time))
    await recordPayrollHours({
      employeeId: ot.employee_id as string,
      branchId,
      workDate: ot.work_date as string,
      hours,
      lineType: "overtime",
      sourceType: "overtime",
      sourceId: id,
    })

    await notifyEmployee(true)
    return { id, status: "approved" }
  }

  if (
    ot.approval_status === "pending_hr" ||
    ot.approval_status === "pending_manager"
  ) {
    if (!canApproveHrRequests(caller.role)) {
      return NextResponse.json(
        { error: "เฉพาะ HR Officer เท่านั้นที่อนุมัติ OT ได้" },
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
