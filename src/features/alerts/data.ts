import { ictToday } from "@/features/employees/data"
import type { AlertRow, AlertTab } from "@/features/alerts/types"
import { createClient } from "@/lib/supabase/server"
import { probationNeedsComplianceAlert } from "@/lib/employees/probation-compliance"

const DAY_MS = 86_400_000
const WINDOW_DAYS = 60
const URGENT_DAYS = 30

function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS
  )
}

function dateField(tab: AlertTab): "probation_end" | "visa_expiry" | "work_permit_expiry" {
  if (tab === "probation") return "probation_end"
  if (tab === "visa") return "visa_expiry"
  return "work_permit_expiry"
}

function isRelevantAlertDate(dueDate: string, today: string, upcomingLimit: string): boolean {
  return dueDate < today || (dueDate >= today && dueDate <= upcomingLimit)
}

export async function getAlertRows(tab: AlertTab): Promise<AlertRow[]> {
  const supabase = await createClient()
  const today = ictToday()
  const upcomingLimit = new Date(Date.parse(`${today}T00:00:00Z`) + WINDOW_DAYS * DAY_MS)
    .toISOString()
    .slice(0, 10)

  const field = dateField(tab)
  const { data, error } = await supabase
    .from("hr_employees")
    .select("id, name, department, probation_end, probation_outcome, visa_expiry, work_permit_expiry, status")
    .eq("status", "active")
    .not(field, "is", null)
    .order(field, { ascending: true })

  if (error) throw error

  return (data ?? [])
    .filter((row) => {
      const dueDate = row[field] as string
      if (!isRelevantAlertDate(dueDate, today, upcomingLimit)) return false
      if (tab === "probation") {
        return probationNeedsComplianceAlert({
          probationEnd: dueDate,
          probationOutcome: row.probation_outcome as string | null,
        })
      }
      return true
    })
    .map((row) => {
      const dueDate = row[field] as string
      return {
        employeeId: row.id,
        name: row.name,
        department: row.department,
        dueDate,
        daysLeft: daysBetween(today, dueDate),
        field: tab,
      }
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
}

export async function getUrgentAlertCount(): Promise<number> {
  const supabase = await createClient()
  const today = ictToday()
  const limit = new Date(Date.parse(`${today}T00:00:00Z`) + URGENT_DAYS * DAY_MS)
    .toISOString()
    .slice(0, 10)

  const { data, error } = await supabase
    .from("hr_employees")
    .select("probation_end, probation_outcome, visa_expiry, work_permit_expiry")
    .eq("status", "active")

  if (error) throw error

  const within = (date: string | null) =>
    date !== null && (date < today || (date >= today && date <= limit))

  let count = 0
  for (const row of data ?? []) {
    if (
      probationNeedsComplianceAlert({
        probationEnd: row.probation_end as string | null,
        probationOutcome: row.probation_outcome as string | null,
      }) &&
      within(row.probation_end as string | null)
    ) {
      count += 1
    }
    if (within(row.visa_expiry)) count += 1
    if (within(row.work_permit_expiry)) count += 1
  }
  return count
}
