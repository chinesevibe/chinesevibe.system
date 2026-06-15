import { NextResponse, type NextRequest } from "next/server"

import { LEAVE_TYPES, type LeaveType } from "@/features/leave/types"
import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

type BalancePatch = {
  leaveType?: string
  totalDays?: number
}

type PatchBody = {
  employeeId?: string
  balances?: BalancePatch[]
}

function isValidTotalDays(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
}

export async function PATCH(request: NextRequest) {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  let body: PatchBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  if (!body.employeeId || !Array.isArray(body.balances) || body.balances.length === 0) {
    return NextResponse.json({ error: "missing payload" }, { status: 400 })
  }

  const normalized = body.balances.map((entry) => ({
    leaveType: entry.leaveType as LeaveType,
    totalDays: entry.totalDays,
  }))

  for (const entry of normalized) {
    if (!LEAVE_TYPES.includes(entry.leaveType)) {
      return NextResponse.json({ error: "invalid leaveType" }, { status: 400 })
    }
    if (!isValidTotalDays(entry.totalDays)) {
      return NextResponse.json({ error: "invalid totalDays" }, { status: 400 })
    }
  }

  const supabase = await createClient()
  const { data: current, error: fetchError } = await supabase
    .from("hr_leave_balances")
    .select("leave_type, used_days")
    .eq("employee_id", body.employeeId)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const currentMap = new Map(
    (current ?? []).map((row) => [row.leave_type as LeaveType, Number(row.used_days)])
  )

  const { error: upsertError } = await supabase
    .from("hr_leave_balances")
    .upsert(
      normalized.map((entry) => ({
        employee_id: body.employeeId!,
        leave_type: entry.leaveType,
        total_days: entry.totalDays!,
        used_days: currentMap.get(entry.leaveType) ?? 0,
      }))
    )

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
