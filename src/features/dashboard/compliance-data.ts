import { ictToday } from "@/features/employees/data"
import { createClient } from "@/lib/supabase/server"
import { probationNeedsComplianceAlert } from "@/lib/employees/probation-compliance"

const DAY_MS = 86_400_000

export const COMPLIANCE_KPI_WINDOW_DAYS = 30
export const COMPLIANCE_LIST_WINDOW_DAYS = 60
export const COMPLIANCE_URGENT_DAYS = 14

export type ComplianceReminderKind = "probation" | "visa" | "work_permit"

export type ComplianceReminderItem = {
  id: string
  kind: ComplianceReminderKind
  title: string
  name: string
  department: string | null
  dueDate: string
  daysLeft: number
  href: string
  urgency: "expired" | "urgent" | "normal"
}

export type ComplianceCounts = {
  probation: number
  visa: number
  workPermit: number
  expired: number
  total: number
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS
  )
}

function windowEnd(today: string, windowDays: number): string {
  return new Date(Date.parse(`${today}T00:00:00Z`) + windowDays * DAY_MS)
    .toISOString()
    .slice(0, 10)
}

function isRelevantComplianceDate(
  dueDate: string,
  today: string,
  upcomingLimit: string
): boolean {
  return dueDate < today || (dueDate >= today && dueDate <= upcomingLimit)
}

const KIND_META: Record<
  ComplianceReminderKind,
  { title: string; expiredTitle: string }
> = {
  probation: {
    title: "ทดลองงานใกล้ครบ",
    expiredTitle: "ทดลองงานครบแล้ว",
  },
  visa: {
    title: "วีซ่าใกล้หมดอายุ",
    expiredTitle: "วีซ่าหมดอายุแล้ว",
  },
  work_permit: {
    title: "Work Permit ใกล้หมด",
    expiredTitle: "Work Permit หมดอายุแล้ว",
  },
}

export async function getDashboardComplianceReminders(
  listLimit = 8
): Promise<{
  items: ComplianceReminderItem[]
  counts: ComplianceCounts
}> {
  const supabase = await createClient()
  const today = ictToday()
  const kpiUpcomingLimit = windowEnd(today, COMPLIANCE_KPI_WINDOW_DAYS)
  const listUpcomingLimit = windowEnd(today, COMPLIANCE_LIST_WINDOW_DAYS)

  const { data, error } = await supabase
    .from("hr_employees")
    .select("id, name, department, probation_end, probation_outcome, visa_expiry, work_permit_expiry")
    .eq("status", "active")

  if (error) throw error

  const counts: ComplianceCounts = {
    probation: 0,
    visa: 0,
    workPermit: 0,
    expired: 0,
    total: 0,
  }
  const items: ComplianceReminderItem[] = []

  const bumpKpiCount = (
    kind: ComplianceReminderKind,
    dueDate: string,
    isExpired: boolean
  ) => {
    if (isExpired) {
      counts.expired += 1
    } else if (dueDate <= kpiUpcomingLimit) {
      if (kind === "probation") counts.probation += 1
      if (kind === "visa") counts.visa += 1
      if (kind === "work_permit") counts.workPermit += 1
    } else {
      return
    }
    counts.total += 1
  }

  const pushItem = (
    kind: ComplianceReminderKind,
    employeeId: string,
    name: string,
    department: string | null,
    dueDate: string
  ) => {
    if (!isRelevantComplianceDate(dueDate, today, listUpcomingLimit)) return

    const daysLeft = daysBetween(today, dueDate)
    const isExpired = daysLeft < 0
    const meta = KIND_META[kind]
    items.push({
      id: `${kind}-${employeeId}`,
      kind,
      title: isExpired ? meta.expiredTitle : meta.title,
      name,
      department,
      dueDate,
      daysLeft,
      href: `/admin/employees/${employeeId}`,
      urgency: isExpired
        ? "expired"
        : daysLeft <= COMPLIANCE_URGENT_DAYS
          ? "urgent"
          : "normal",
    })
  }

  for (const row of data ?? []) {
    const probation = row.probation_end as string | null
    const probationOutcome = row.probation_outcome as string | null
    const visa = row.visa_expiry as string | null
    const workPermit = row.work_permit_expiry as string | null

    if (
      probation &&
      probationNeedsComplianceAlert({ probationEnd: probation, probationOutcome }) &&
      isRelevantComplianceDate(probation, today, kpiUpcomingLimit)
    ) {
      bumpKpiCount("probation", probation, probation < today)
    }
    if (visa && isRelevantComplianceDate(visa, today, kpiUpcomingLimit)) {
      bumpKpiCount("visa", visa, visa < today)
    }
    if (workPermit && isRelevantComplianceDate(workPermit, today, kpiUpcomingLimit)) {
      bumpKpiCount("work_permit", workPermit, workPermit < today)
    }

    if (
      probation &&
      probationNeedsComplianceAlert({ probationEnd: probation, probationOutcome })
    ) {
      pushItem("probation", row.id, row.name, row.department, probation)
    }
    if (visa) {
      pushItem("visa", row.id, row.name, row.department, visa)
    }
    if (workPermit) {
      pushItem("work_permit", row.id, row.name, row.department, workPermit)
    }
  }

  items.sort((a, b) => a.daysLeft - b.daysLeft)

  return {
    items: items.slice(0, listLimit),
    counts,
  }
}
