import { NextResponse, type NextRequest } from "next/server"

import { LEAVE_TYPES, type LeaveType } from "@/features/leave/types"
import { getLeavePolicies } from "@/features/leaves/insights"
import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

type PatchBody = {
  leaveType?: string
  annualDays?: number
}

function isValidAnnualDays(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
}

export async function GET() {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const rows = await getLeavePolicies()
  return NextResponse.json({ rows })
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

  if (!LEAVE_TYPES.includes(body.leaveType as LeaveType)) {
    return NextResponse.json({ error: "invalid leaveType" }, { status: 400 })
  }
  if (!isValidAnnualDays(body.annualDays)) {
    return NextResponse.json({ error: "invalid annualDays" }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("hr_leave_policy_defaults")
    .upsert({
      leave_type: body.leaveType,
      annual_days: body.annualDays,
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
