import { getAdminClient } from "@/lib/auth/admin-client"

export interface YtdResult {
  ytdGross: number
  ytdTax: number
  ytdSso: number
}

/**
 * Compute year-to-date totals for an employee across all locked payroll runs
 * in the same calendar year as `year`.
 * Excludes the current run_id if provided (so the payslip can show running YTD
 * including itself by omitting runId, or prior-runs-only by passing runId).
 */
export async function getYtdForEmployee(
  employeeId: string,
  year: number,
  excludeRunId?: string
): Promise<YtdResult> {
  const admin = getAdminClient()

  const yearStart = `${year}-01-01`
  const yearEnd = `${year + 1}-01-01`

  let query = admin
    .from("hr_payslips")
    .select(
      `gross_amount, tax_deduction, sso_deduction,
       hr_payroll_runs!inner(status, period_start)`
    )
    .eq("employee_id", employeeId)
    .eq("hr_payroll_runs.status", "locked")
    .gte("hr_payroll_runs.period_start", yearStart)
    .lt("hr_payroll_runs.period_start", yearEnd)

  if (excludeRunId) {
    query = query.neq("run_id", excludeRunId)
  }

  const { data, error } = await query

  if (error) {
    console.error("[ytd] query error", error)
    return { ytdGross: 0, ytdTax: 0, ytdSso: 0 }
  }

  const rows = (data ?? []) as Array<{
    gross_amount: number
    tax_deduction: number
    sso_deduction: number
  }>

  return rows.reduce(
    (acc, row) => ({
      ytdGross: acc.ytdGross + Number(row.gross_amount ?? 0),
      ytdTax: acc.ytdTax + Number(row.tax_deduction ?? 0),
      ytdSso: acc.ytdSso + Number(row.sso_deduction ?? 0),
    }),
    { ytdGross: 0, ytdTax: 0, ytdSso: 0 }
  )
}
