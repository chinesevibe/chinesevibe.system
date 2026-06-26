import { NextRequest, NextResponse } from "next/server"
import { getAdminClient } from "@/lib/auth/admin-client"
import { getYtdForEmployee } from "@/lib/payroll/ytd"

type Params = { params: Promise<{ id: string }> }

/** GET /api/payroll/payslips/[id]/ytd — year-to-date totals for the employee on this payslip */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id: payslipId } = await params
  const admin = getAdminClient()

  const { data: payslip, error } = await admin
    .from("hr_payslips")
    .select("employee_id, run_id, hr_payroll_runs!inner(period_start)")
    .eq("id", payslipId)
    .single()

  if (error || !payslip) {
    return NextResponse.json({ error: "payslip not found" }, { status: 404 })
  }

  const run = (
    Array.isArray(payslip.hr_payroll_runs)
      ? payslip.hr_payroll_runs[0]
      : payslip.hr_payroll_runs
  ) as { period_start: string }
  const year = new Date(run.period_start).getFullYear()

  const ytd = await getYtdForEmployee(payslip.employee_id, year)

  return NextResponse.json(ytd)
}
