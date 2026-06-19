// Dashboard aggregation — read-only through the caller's session client so
// RLS (hr_is_hr_admin) is the authorization layer. No service role here.
import { ictDayRangeUtc } from "@/lib/attendance/late"
import { createClient } from "@/lib/supabase/server"
import { probationNeedsComplianceAlert } from "@/lib/employees/probation-compliance"

const DAY_MS = 86_400_000
const ICT_OFFSET_MS = 7 * 60 * 60 * 1000
const EXPIRY_WINDOW_DAYS = 30

export type DashboardStats = {
  totalActiveEmployees: number
  checkedInToday: number
  lateToday: number
  absentToday: number
  pendingLeaves: number
  expiring: {
    total: number
    expired: number
    probation: number
    visa: number
    workPermit: number
  }
  attendanceByDay: Array<{ day: string; count: number }>
  leavesByStatus: Array<{ status: string; count: number }>
  pendingApprovalCount: number
  pendingDocumentCount: number
  openComplaintCount: number
}

// "YYYY-MM-DD" of the ICT day containing `instant`, for date-column compares.
function ictDateString(instant: Date): string {
  return new Date(instant.getTime() + ICT_OFFSET_MS).toISOString().slice(0, 10)
}

// "DD/MM" label for the ICT day starting at `dayStartUtc`.
function ictDayLabel(dayStartUtc: Date): string {
  const ict = new Date(dayStartUtc.getTime() + ICT_OFFSET_MS)
  const dd = String(ict.getUTCDate()).padStart(2, "0")
  const mm = String(ict.getUTCMonth() + 1).padStart(2, "0")
  return `${dd}/${mm}`
}

export async function getDashboardStats(
  now: Date = new Date()
): Promise<DashboardStats> {
  const supabase = await createClient()

  const { start: todayStart, end: todayEnd } = ictDayRangeUtc(now)
  const windowStart = new Date(todayStart.getTime() - 6 * DAY_MS)
  const todayIct = ictDateString(now)
  const expiryLimit = ictDateString(
    new Date(now.getTime() + EXPIRY_WINDOW_DAYS * DAY_MS)
  )

  const [
    activeRes,
    weekRes,
    pendingRes,
    leavesRes,
    expiryRes,
    registrationCountRes,
    onboardingCountRes,
    attSubmissionCountRes,
    otCountRes,
    locationReviewCountRes,
    pendingDocCountRes,
    complaintCountRes,
  ] =
    await Promise.all([
      supabase
        .from("hr_employees")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("hr_attendance")
        .select("check_in_at, is_late")
        .gte("check_in_at", windowStart.toISOString())
        .lt("check_in_at", todayEnd.toISOString()),
      supabase
        .from("hr_leaves")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase.from("hr_leaves").select("status"),
      supabase
        .from("hr_employees")
        .select("probation_end, probation_outcome, visa_expiry, work_permit_expiry")
        .eq("status", "active"),
      supabase
        .from("hr_employees")
        .select("id", { count: "exact", head: true })
        .eq("status", "inactive")
        .eq("role", "employee"),
      supabase
        .from("hr_employees")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .eq("role", "employee")
        .is("branch_id", null),
      supabase
        .from("hr_attendance_submissions")
        .select("id", { count: "exact", head: true })
        .eq("approval_status", "pending_hr"),
      supabase
        .from("hr_overtime_requests")
        .select("id", { count: "exact", head: true })
        .eq("approval_status", "pending_hr"),
      supabase
        .from("hr_attendance")
        .select("id", { count: "exact", head: true })
        .eq("location_review_status", "pending_hr"),
      supabase
        .from("hr_document_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("hr_complaints")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
    ])

  const totalActiveEmployees = activeRes.count ?? 0
  const pendingLeaves = pendingRes.count ?? 0

  // Bucket the 7-day window per ICT day; today is the last bucket.
  const weekRows = (weekRes.data ?? []) as Array<{
    check_in_at: string
    is_late: boolean
  }>
  const buckets = Array.from({ length: 7 }, (_, i) => ({
    day: ictDayLabel(new Date(windowStart.getTime() + i * DAY_MS)),
    count: 0,
  }))
  let checkedInToday = 0
  let lateToday = 0
  for (const row of weekRows) {
    const t = new Date(row.check_in_at).getTime()
    const index = Math.floor((t - windowStart.getTime()) / DAY_MS)
    if (index >= 0 && index < 7) {
      buckets[index].count += 1
    }
    if (t >= todayStart.getTime()) {
      checkedInToday += 1
      if (row.is_late) {
        lateToday += 1
      }
    }
  }
  const absentToday = Math.max(0, totalActiveEmployees - checkedInToday)

  const statusCounts = new Map<string, number>()
  for (const row of (leavesRes.data ?? []) as Array<{ status: string }>) {
    statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1)
  }
  const leavesByStatus = Array.from(statusCounts, ([status, count]) => ({
    status,
    count,
  })).sort((a, b) => b.count - a.count)

  // Date columns are "YYYY-MM-DD" strings — string compare is date compare.
  const withinWindow = (date: string | null): boolean =>
    date !== null && (date < todayIct || (date >= todayIct && date <= expiryLimit))
  const expiring = { total: 0, expired: 0, probation: 0, visa: 0, workPermit: 0 }
  for (const row of (expiryRes.data ?? []) as Array<{
    probation_end: string | null
    probation_outcome: string | null
    visa_expiry: string | null
    work_permit_expiry: string | null
  }>) {
    if (
      probationNeedsComplianceAlert({
        probationEnd: row.probation_end,
        probationOutcome: row.probation_outcome,
      }) &&
      withinWindow(row.probation_end)
    ) {
      expiring.probation += 1
      expiring.total += 1
      if ((row.probation_end as string) < todayIct) expiring.expired += 1
    }
    if (withinWindow(row.visa_expiry)) {
      expiring.visa += 1
      expiring.total += 1
      if ((row.visa_expiry as string) < todayIct) expiring.expired += 1
    }
    if (withinWindow(row.work_permit_expiry)) {
      expiring.workPermit += 1
      expiring.total += 1
      if ((row.work_permit_expiry as string) < todayIct) expiring.expired += 1
    }
  }
  const pendingApprovalCount =
    (registrationCountRes.count ?? 0) +
    (onboardingCountRes.count ?? 0) +
    pendingLeaves +
    (attSubmissionCountRes.count ?? 0) +
    (otCountRes.count ?? 0) +
    (locationReviewCountRes.count ?? 0)

  return {
    totalActiveEmployees,
    checkedInToday,
    lateToday,
    absentToday,
    pendingLeaves,
    expiring,
    attendanceByDay: buckets,
    leavesByStatus,
    pendingApprovalCount,
    pendingDocumentCount: pendingDocCountRes.count ?? 0,
    openComplaintCount: complaintCountRes.count ?? 0,
  }
}
