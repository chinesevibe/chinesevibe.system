import { NextResponse } from "next/server"

import { getCurrentEmployee } from "@/lib/auth/session"
import { lockRun } from "@/lib/payroll/run"

function canManagePayroll(role: string): boolean {
  return ["hr", "dev"].includes(role)
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await getCurrentEmployee()
    if (!caller || !canManagePayroll(caller.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const run = await lockRun(id, caller.id)

    return NextResponse.json({ success: true, run })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
