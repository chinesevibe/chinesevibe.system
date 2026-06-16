import { createClient } from "@/lib/supabase/server"
import { EMPLOYEE_VIA_ATTENDANCE } from "@/lib/supabase/employee-embeds"

export async function getAttendanceReport(days = 30, department?: string) {
  const supabase = await createClient()
  const since = new Date(Date.now() - days * 86_400_000).toISOString()

  const { data, error } = await supabase
    .from("hr_attendance")
    .select(`check_in_at, is_late, work_hours, ${EMPLOYEE_VIA_ATTENDANCE}(name, department)`)
    .gte("check_in_at", since)
    .order("check_in_at", { ascending: false })
    .limit(200)

  if (error) throw error
  let rows = data ?? []
  if (department) {
    rows = rows.filter((r) => {
      const emp = Array.isArray(r.hr_employees) ? r.hr_employees[0] : r.hr_employees
      return (emp as { department?: string })?.department === department
    })
  }
  return rows
}

export async function getLeaveReportSummary(days = 90, department?: string) {
  const supabase = await createClient()
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from("hr_leaves")
    .select("status, type, start_date, end_date, hr_employees!employee_id(name, department)")
    .gte("start_date", since)
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) throw error
  let rows = data ?? []
  if (department) {
    rows = rows.filter((r) => {
      const emp = Array.isArray(r.hr_employees) ? r.hr_employees[0] : r.hr_employees
      return (emp as { department?: string })?.department === department
    })
  }
  return rows
}

export async function getOvertimeReportSummary(department?: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("hr_overtime_requests")
    .select("work_date, start_time, end_time, status, hr_employees!employee_id(name, department)")
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) throw error
  let rows = data ?? []
  if (department) {
    rows = rows.filter((r) => {
      const emp = Array.isArray(r.hr_employees) ? r.hr_employees[0] : r.hr_employees
      return (emp as { department?: string })?.department === department
    })
  }
  return rows
}

export async function getReportDepartments() {
  const supabase = await createClient()
  const { data, error } = await supabase.from("hr_departments").select("name").order("name")
  if (error) throw error
  return (data ?? []).map((d) => d.name as string)
}
