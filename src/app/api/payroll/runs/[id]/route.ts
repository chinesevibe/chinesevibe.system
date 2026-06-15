import { NextResponse } from "next/server"

import { getCurrentEmployee } from "@/lib/auth/session"
import { getRunWithPayslips } from "@/lib/payroll/run"

function canManagePayroll(role: string): boolean {
  return ["hr", "admin", "dev"].includes(role)
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await getCurrentEmployee()
    if (!caller || !canManagePayroll(caller.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const run = await getRunWithPayslips(id)
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 })
    }

    return NextResponse.json({ run })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
