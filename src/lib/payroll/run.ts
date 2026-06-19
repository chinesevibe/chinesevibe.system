import { getAdminClient } from "@/lib/auth/admin-client"
import { aggregatePayrollPeriod } from "@/lib/payroll/aggregate"
import { calculatePayslip, shouldSkipEmployee } from "@/lib/payroll/calculate"
import { getPayrollConfig } from "@/lib/payroll/config"
import { resolvePeriodRange } from "@/lib/payroll/period-range"
import type { PayrollRunWithPayslips, PayslipRow } from "@/lib/payroll/types"

export interface CreateOrRefreshRunInput {
  period: string
  cutoffDay?: number
  periodStart?: string
  periodEnd?: string
}

export interface CreateOrRefreshRunResult {
  run: PayrollRunWithPayslips
  skipped: string[]
}

export async function createOrRefreshRun(
  input: CreateOrRefreshRunInput
): Promise<CreateOrRefreshRunResult> {
  const config = await getPayrollConfig()
  const cutoffDay = input.cutoffDay ?? config.payroll_cutoff_day

  const range = resolvePeriodRange({
    period: input.period,
    cutoffDay,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
  })

  const admin = getAdminClient()

  const { data: existingRun } = await admin
    .from("hr_payroll_runs")
    .select("id, status")
    .eq("period", input.period)
    .eq("cutoff_day", cutoffDay)
    .maybeSingle()

  if (existingRun?.status === "locked" || existingRun?.status === "paid") {
    throw new Error("รอบนี้ถูก lock แล้ว — ไม่สามารถ refresh ได้")
  }

  const { summaries, paymentDates } = await aggregatePayrollPeriod({
    period: input.period,
    periodStart: range.periodStart,
    periodEndExclusive: range.periodEndExclusive,
  })

  const taxEnabled = config.tax_enabled
  const taxRate = config.tax_rate

  const skipped: string[] = []
  let totalGross = 0
  let totalNet = 0
  let employeeCount = 0

  const runPayload = {
    period: input.period,
    period_start: range.periodStart,
    period_end: range.periodEnd,
    cutoff_day: cutoffDay,
    status: "draft" as const,
    employee_count: 0,
    total_gross: 0,
    total_net: 0,
  }

  let runId: string

  if (existingRun?.id) {
    runId = existingRun.id as string
    await admin.from("hr_payroll_runs").update(runPayload).eq("id", runId)

    const { data: oldSlips } = await admin.from("hr_payslips").select("id").eq("run_id", runId)
    const oldIds = (oldSlips ?? []).map((s) => s.id as string)
    if (oldIds.length > 0) {
      await admin.from("hr_payslip_lines").delete().in("payslip_id", oldIds)
      await admin.from("hr_payslips").delete().eq("run_id", runId)
    }
  } else {
    const { data: created, error } = await admin
      .from("hr_payroll_runs")
      .insert(runPayload)
      .select("id")
      .single()
    if (error) throw new Error(error.message)
    runId = created.id as string
  }

  for (const [, summary] of summaries) {
    const skipReason = shouldSkipEmployee(summary)
    if (skipReason) {
      skipped.push(`${summary.employee_name}: ${skipReason}`)
      continue
    }

    const calc = calculatePayslip(summary, config, { taxEnabled, taxRate })
    if (!calc) {
      skipped.push(`${summary.employee_name}: ไม่สามารถคำนวณได้`)
      continue
    }

    const paymentDate = paymentDates.get(summary.employee_id)!
    const { data: slip, error: slipError } = await admin
      .from("hr_payslips")
      .insert({
        run_id: runId,
        employee_id: summary.employee_id,
        pay_type: summary.pay_type,
        pay_day: summary.pay_day,
        payment_date: paymentDate,
        gross_amount: calc.gross_amount,
        sso_deduction: calc.sso_deduction,
        other_deductions: calc.other_deductions,
        tax_deduction: calc.tax_deduction,
        net_amount: calc.net_amount,
        status: "draft",
        regular_hours: calc.regular_hours,
        ot_hours: calc.ot_hours,
        sick_hours: calc.sick_hours,
        annual_hours: calc.annual_hours,
        base_rate: calc.base_rate,
        monthly_salary: calc.monthly_salary,
      })
      .select("id")
      .single()

    if (slipError) throw new Error(slipError.message)

    if (calc.lines.length > 0) {
      const { error: linesError } = await admin.from("hr_payslip_lines").insert(
        calc.lines.map((line) => ({
          payslip_id: slip.id,
          code: line.code,
          label: line.label,
          amount: line.amount,
          sort_order: line.sort_order,
        }))
      )
      if (linesError) throw new Error(linesError.message)
    }

    totalGross += calc.gross_amount
    totalNet += calc.net_amount
    employeeCount += 1
  }

  await admin
    .from("hr_payroll_runs")
    .update({
      employee_count: employeeCount,
      total_gross: Math.round(totalGross * 100) / 100,
      total_net: Math.round(totalNet * 100) / 100,
    })
    .eq("id", runId)

  const run = await getRunWithPayslips(runId)
  if (!run) throw new Error("Failed to load payroll run")
  return { run, skipped }
}

export async function lockRun(runId: string, lockedBy: string): Promise<PayrollRunWithPayslips> {
  const admin = getAdminClient()

  const { data: run, error: fetchError } = await admin
    .from("hr_payroll_runs")
    .select("id, status")
    .eq("id", runId)
    .maybeSingle()

  if (fetchError) throw new Error(fetchError.message)
  if (!run) throw new Error("ไม่พบรอบ payroll")
  if (run.status === "locked" || run.status === "paid") {
    throw new Error("รอบนี้ถูก lock แล้ว")
  }

  const { error: updateError } = await admin
    .from("hr_payroll_runs")
    .update({
      status: "locked",
      locked_at: new Date().toISOString(),
      locked_by: lockedBy,
    })
    .eq("id", runId)

  if (updateError) throw new Error(updateError.message)

  await admin.from("hr_payslips").update({ status: "final" }).eq("run_id", runId)

  const updated = await getRunWithPayslips(runId)
  if (!updated) throw new Error("Failed to load payroll run")
  return updated
}

function mapPayslipRow(row: Record<string, unknown>, employeeName?: string): PayslipRow {
  return {
    id: row.id as string,
    run_id: row.run_id as string,
    employee_id: row.employee_id as string,
    employee_name: employeeName,
    pay_type: row.pay_type as PayslipRow["pay_type"],
    pay_day: row.pay_day as PayslipRow["pay_day"],
    payment_date: row.payment_date as string,
    gross_amount: Number(row.gross_amount),
    sso_deduction: Number(row.sso_deduction),
    other_deductions: Number(row.other_deductions),
    tax_deduction: Number(row.tax_deduction),
    net_amount: Number(row.net_amount),
    status: row.status as PayslipRow["status"],
    pdf_path: (row.pdf_path as string | null) ?? null,
    regular_hours: Number(row.regular_hours),
    ot_hours: Number(row.ot_hours),
    sick_hours: Number(row.sick_hours),
    annual_hours: Number(row.annual_hours),
    base_rate: row.base_rate != null ? Number(row.base_rate) : null,
    monthly_salary: row.monthly_salary != null ? Number(row.monthly_salary) : null,
  }
}

export async function getRunWithPayslips(runId: string): Promise<PayrollRunWithPayslips | null> {
  const admin = getAdminClient()

  const { data: run, error } = await admin
    .from("hr_payroll_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!run) return null

  const { data: payslips, error: slipsError } = await admin
    .from("hr_payslips")
    .select("*")
    .eq("run_id", runId)
    .order("pay_day")
    .order("employee_id")

  if (slipsError) throw new Error(slipsError.message)

  const employeeIds = [...new Set((payslips ?? []).map((p) => p.employee_id as string))]
  const nameMap = new Map<string, string>()
  if (employeeIds.length > 0) {
    const { data: employees } = await admin
      .from("hr_employees")
      .select("id, name")
      .in("id", employeeIds)
    for (const emp of employees ?? []) {
      nameMap.set(emp.id as string, emp.name as string)
    }
  }

  return {
    id: run.id as string,
    period: run.period as string,
    period_start: run.period_start as string,
    period_end: run.period_end as string,
    cutoff_day: run.cutoff_day as number | null,
    status: run.status as PayrollRunWithPayslips["status"],
    locked_at: (run.locked_at as string | null) ?? null,
    locked_by: (run.locked_by as string | null) ?? null,
    employee_count: Number(run.employee_count),
    total_gross: Number(run.total_gross),
    total_net: Number(run.total_net),
    created_at: run.created_at as string,
    updated_at: run.updated_at as string,
    payslips: (payslips ?? []).map((p) =>
      mapPayslipRow(p as Record<string, unknown>, nameMap.get(p.employee_id as string))
    ),
  }
}

export async function getRunByPeriod(
  period: string,
  cutoffDay?: number
): Promise<PayrollRunWithPayslips | null> {
  const admin = getAdminClient()
  let query = admin
    .from("hr_payroll_runs")
    .select("id")
    .eq("period", period)
    .order("updated_at", { ascending: false })
    .limit(1)

  if (typeof cutoffDay === "number" && Number.isFinite(cutoffDay)) {
    query = query.eq("cutoff_day", cutoffDay)
  }

  const { data: rows } = await query
  const run = rows?.[0]
  if (!run?.id) return null
  return getRunWithPayslips(run.id as string)
}
