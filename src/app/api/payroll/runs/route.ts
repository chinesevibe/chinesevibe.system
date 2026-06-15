import { NextRequest, NextResponse } from "next/server"

import { getCurrentEmployee } from "@/lib/auth/session"
import { createOrRefreshRun, getRunByPeriod } from "@/lib/payroll/run"

function canManagePayroll(role: string): boolean {
  return ["hr", "dev"].includes(role)
}

export async function POST(req: NextRequest) {
  try {
    const caller = await getCurrentEmployee()
    if (!caller || !canManagePayroll(caller.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { period, cutoffDay, periodStart, periodEnd } = body as {
      period?: string
      cutoffDay?: number
      periodStart?: string
      periodEnd?: string
    }

    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      return NextResponse.json(
        { error: "Invalid period format. Expected YYYY-MM" },
        { status: 400 }
      )
    }

    const result = await createOrRefreshRun({
      period,
      cutoffDay,
      periodStart,
      periodEnd,
    })

    return NextResponse.json({
      success: true,
      run: result.run,
      skipped: result.skipped.length > 0 ? result.skipped : undefined,
    })
  } catch (error) {
    console.error("payroll run create error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const caller = await getCurrentEmployee()
    if (!caller || !canManagePayroll(caller.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const period = req.nextUrl.searchParams.get("period")
    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      return NextResponse.json(
        { error: "Query param period=YYYY-MM required" },
        { status: 400 }
      )
    }

    const run = await getRunByPeriod(period)
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
