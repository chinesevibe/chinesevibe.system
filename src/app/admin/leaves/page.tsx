import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { CountBadge } from "@/components/brand/CountBadge"
import {
  getLeaveBalances,
  getLeaveCalendar,
  getLeavePolicies,
  getLeaveReport,
  normalizeLeaveView,
} from "@/features/leaves/insights"
import { LeaveBalancesTable } from "@/features/leaves/LeaveBalancesTable"
import { LeaveCalendar } from "@/features/leaves/LeaveCalendar"
import { LeaveFilters } from "@/features/leaves/LeaveFilters"
import { LeavePagination } from "@/features/leaves/LeavePagination"
import { LeaveReportTable } from "@/features/leaves/LeaveReportTable"
import { LeaveTable } from "@/features/leaves/LeaveTable"
import { LeaveViewTabs } from "@/features/leaves/LeaveViewTabs"
import { getLeaveRequests, normalizeLeaveParams } from "@/features/leaves/data"

export default async function AdminLeavesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const raw = await searchParams
  const { view, month } = normalizeLeaveView(raw)

  const pendingCount =
    view === "requests"
      ? (await getLeaveRequests(normalizeLeaveParams(raw))).pendingCount
      : (
          await getLeaveRequests({ status: "pending", page: 1 })
        ).pendingCount

  return (
    <AdminPageShell
      title="Leave Management"
      description="จัดการคำขอลา ปฏิทิน รายงาน และยอดคงเหลือ"
      badge={<CountBadge count={pendingCount} label="รออนุมัติ" />}
    >
      <div className="flex flex-col gap-4">
        <LeaveViewTabs active={view} />
        {view === "requests" ? <RequestsView raw={raw} /> : null}
        {view === "calendar" ? <CalendarView month={month} /> : null}
        {view === "report" ? <ReportView month={month} /> : null}
        {view === "balances" ? <BalancesView /> : null}
      </div>
    </AdminPageShell>
  )
}

async function RequestsView({
  raw,
}: {
  raw: { [key: string]: string | string[] | undefined }
}) {
  const params = normalizeLeaveParams(raw)
  const { rows, total } = await getLeaveRequests(params)
  return (
    <>
      <LeaveFilters status={params.status} />
      <LeaveTable rows={rows} />
      <LeavePagination page={params.page} total={total} />
    </>
  )
}

async function CalendarView({ month }: { month: string }) {
  const entries = await getLeaveCalendar(month)
  return <LeaveCalendar month={month} entries={entries} />
}

async function ReportView({ month }: { month: string }) {
  const rows = await getLeaveReport(month)
  return <LeaveReportTable month={month} rows={rows} />
}

async function BalancesView() {
  const [rows, policies] = await Promise.all([getLeaveBalances(), getLeavePolicies()])
  return <LeaveBalancesTable rows={rows} policies={policies} />
}
