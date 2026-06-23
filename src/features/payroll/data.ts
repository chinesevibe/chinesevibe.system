import { createClient } from "@/lib/supabase/server"
import { roundPayrollHours } from "@/lib/payroll/hour-policy"

export async function getPayrollHourReport(year: number, month: number) {
  const supabase = await createClient()

  const { data: periods } = await supabase
    .from("hr_payroll_periods")
    .select("id, branch_id, hr_branches(name)")
    .eq("year", year)
    .eq("month", month)

  if (!periods?.length) return []

  const periodIds = periods.map((p) => p.id as string)
  const { data: lines, error } = await supabase
    .from("hr_payroll_hour_lines")
    .select("line_type, hours, work_date, hr_employees(name, department)")
    .in("period_id", periodIds)
    .order("work_date", { ascending: false })

  if (error) throw error

  const byEmployee = new Map<
    string,
    { name: string; department: string; regular: number; overtime: number; sick: number }
  >()

  for (const line of lines ?? []) {
    const emp = Array.isArray(line.hr_employees) ? line.hr_employees[0] : line.hr_employees
    const name = (emp as { name: string })?.name ?? "—"
    const department = (emp as { department?: string })?.department ?? "—"
    const key = `${name}|${department}`
    const cur = byEmployee.get(key) ?? { name, department, regular: 0, overtime: 0, sick: 0 }
    const h = roundPayrollHours(Number(line.hours))
    if (line.line_type === "regular") cur.regular += h
    if (line.line_type === "overtime") cur.overtime += h
    if (line.line_type === "sick_hourly") cur.sick += h
    byEmployee.set(key, cur)
  }

  return Array.from(byEmployee.values()).sort((a, b) => a.name.localeCompare(b.name))
}
