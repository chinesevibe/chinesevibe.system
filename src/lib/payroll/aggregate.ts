import { getAdminClient } from "@/lib/auth/admin-client"
import { roundPayrollHours } from "@/lib/payroll/hour-policy"
import { computePaymentDate, resolvePayDay, type PayDay } from "@/lib/payroll/pay-day"
import type { PayType } from "@/lib/payroll/pay-type"
import type { PayrollSummary } from "@/lib/payroll/types"

function otHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number)
  const [eh, em] = endTime.split(":").map(Number)
  return roundPayrollHours(Math.max(0, eh + em / 60 - (sh + sm / 60)))
}

type EmployeeRow = {
  id: string
  name: string
  salary: number | null
  housing_allowance: number | null
  pay_type: PayType
  nationality: string | null
  pay_day: number | null
}

export interface AggregatePayrollInput {
  period: string
  periodStart: string
  periodEndExclusive: string
}

export interface AggregatePayrollResult {
  summaries: Map<string, PayrollSummary>
  paymentDates: Map<string, string>
  skipped: string[]
}

export async function aggregatePayrollPeriod(
  input: AggregatePayrollInput
): Promise<AggregatePayrollResult> {
  const { period, periodStart, periodEndExclusive } = input
  const supabase = getAdminClient()

  const { data: employees, error: employeesError } = await supabase
    .from("hr_employees")
    .select("id, name, salary, housing_allowance, pay_type, nationality, pay_day")
    .eq("status", "active")

  let employeeRows: EmployeeRow[] = (employees as EmployeeRow[] | null) ?? []

  if (employeesError?.message?.includes("nationality") || employeesError?.message?.includes("pay_day")) {
    const { data: fallback, error: fallbackError } = await supabase
      .from("hr_employees")
      .select("id, name, salary, housing_allowance, pay_type")
      .eq("status", "active")
    if (fallbackError) {
      throw new Error(`Failed to fetch employees: ${fallbackError.message}`)
    }
    employeeRows = ((fallback ?? []) as Omit<EmployeeRow, "nationality" | "pay_day">[]).map((row) => ({
      ...row,
      nationality: null,
      pay_day: 4,
    }))
  } else if (employeesError) {
    throw new Error(`Failed to fetch employees: ${employeesError.message}`)
  }

  const { data: hourLines, error: linesError } = await supabase
    .from("hr_payroll_hour_lines")
    .select("employee_id, line_type, hours, work_date")
    .gte("work_date", periodStart)
    .lt("work_date", periodEndExclusive)

  if (linesError) {
    throw new Error(`Failed to fetch payroll hour lines: ${linesError.message}`)
  }

  const { data: overtime, error: overtimeError } = await supabase
    .from("hr_overtime_requests")
    .select("employee_id, work_date, start_time, end_time, status")
    .eq("status", "approved")
    .gte("work_date", periodStart)
    .lt("work_date", periodEndExclusive)

  if (overtimeError) {
    throw new Error(`Failed to fetch overtime: ${overtimeError.message}`)
  }

  const { data: leaves, error: leavesError } = await supabase
    .from("hr_leaves")
    .select("employee_id, type, start_date, end_date, leave_hours, status")
    .eq("status", "approved")
    .lt("start_date", periodEndExclusive)
    .gte("end_date", periodStart)

  if (leavesError) {
    throw new Error(`Failed to fetch leaves: ${leavesError.message}`)
  }

  const summaries = new Map<string, PayrollSummary>()
  const paymentDates = new Map<string, string>()

  for (const emp of employeeRows) {
    const payDay = resolvePayDay(emp.nationality, emp.pay_day)
    summaries.set(emp.id, {
      employee_id: emp.id,
      employee_name: emp.name,
      pay_type: (emp.pay_type as PayType) ?? "hourly",
      pay_day: payDay,
      salary: emp.salary != null ? Number(emp.salary) : null,
      housing_allowance: emp.housing_allowance != null ? Number(emp.housing_allowance) : 0,
      worked_hours: 0,
      overtime_hours: 0,
      sick_leave_hours: 0,
      annual_leave_hours: 0,
    })
    paymentDates.set(emp.id, computePaymentDate(period, payDay))
  }

  for (const line of hourLines ?? []) {
    const data = summaries.get(line.employee_id as string)
    if (!data) continue
    const h = roundPayrollHours(Number(line.hours))
    if (line.line_type === "regular") data.worked_hours += h
    if (line.line_type === "overtime") data.overtime_hours += h
    if (line.line_type === "sick_hourly") data.sick_leave_hours += h
  }

  for (const emp of employeeRows) {
    const data = summaries.get(emp.id)
    if (!data || data.pay_type !== "monthly") continue

    overtime?.forEach((ot) => {
      if (ot.employee_id === emp.id && ot.start_time && ot.end_time) {
        data.overtime_hours += otHours(ot.start_time as string, ot.end_time as string)
      }
    })

    leaves?.forEach((leave) => {
      if (leave.employee_id !== emp.id) return
      if (leave.type === "sick" && leave.leave_hours) {
        data.sick_leave_hours += roundPayrollHours(Number(leave.leave_hours))
      } else if (leave.type === "annual" && leave.leave_hours) {
        data.annual_leave_hours += roundPayrollHours(Number(leave.leave_hours))
      }
    })
  }

  return { summaries, paymentDates, skipped: [] }
}

export function groupByPayDay(
  payslips: Array<{ pay_day: PayDay; employee_name: string }>
): Map<PayDay, typeof payslips> {
  const map = new Map<PayDay, typeof payslips>()
  for (const slip of payslips) {
    const group = map.get(slip.pay_day) ?? []
    group.push(slip)
    map.set(slip.pay_day, group)
  }
  return map
}
