import { getAdminClient } from "@/lib/auth/admin-client"
import { roundPayrollHours } from "@/lib/payroll/hour-policy"

type LineType = "regular" | "overtime" | "sick_hourly"

async function getOrCreatePeriod(
  workDate: string,
  branchId: string | null
): Promise<string> {
  const admin = getAdminClient()
  const [year, month] = workDate.split("-").map(Number)

  const { data: existing } = await admin
    .from("hr_payroll_periods")
    .select("id")
    .eq("year", year)
    .eq("month", month)
    .eq("branch_id", branchId)
    .maybeSingle()

  if (existing?.id) return existing.id as string

  const { data: created, error } = await admin
    .from("hr_payroll_periods")
    .insert({ year, month, branch_id: branchId })
    .select("id")
    .single()

  if (error) throw error
  return created.id as string
}

export async function recordPayrollHours({
  employeeId,
  branchId,
  workDate,
  hours,
  lineType,
  sourceType,
  sourceId,
}: {
  employeeId: string
  branchId: string | null
  workDate: string
  hours: number
  lineType: LineType
  sourceType: string
  sourceId: string
}) {
  const roundedHours = roundPayrollHours(hours)
  if (roundedHours <= 0) return

  const admin = getAdminClient()
  const periodId = await getOrCreatePeriod(workDate, branchId)

  await admin.from("hr_payroll_hour_lines").upsert(
    {
      period_id: periodId,
      employee_id: employeeId,
      line_type: lineType,
      hours: roundedHours,
      work_date: workDate,
      source_type: sourceType,
      source_id: sourceId,
    },
    { onConflict: "source_type,source_id" }
  )
}
