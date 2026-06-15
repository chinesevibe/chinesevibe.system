import Link from "next/link"
import {
  Building2,
  CalendarDays,
  Download,
  ListChecks,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react"

import { HeroBanner } from "@/components/brand/HeroBanner"
import { KpiCard } from "@/components/brand/KpiCard"
import { StatusPill } from "@/components/brand/StatusPill"
import { WidgetCard } from "@/components/brand/WidgetCard"
import {
  CeoAttendanceDonut,
  CeoPayrollDonut,
  CeoWeekTrend,
} from "@/features/ceo-dashboard/charts"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import {
  InventoryLowStockWidget,
  InventoryPendingInboundWidget,
  InventoryZeroStockWidget,
} from "@/features/inventory/InventoryDashboardWidgets"
import type { InventoryDashboardSummary } from "@/features/inventory/report-data"

import { formatPayrollHours, roundPayrollHours } from "@/lib/payroll/format-hours"

import type { CeoDashboardData } from "./data"

const LEAVE_STATUS_VARIANT = {
  approved: "approved",
  pending: "pending",
  rejected: "rejected",
} as const

export function CeoDashboard({
  userName,
  data,
  inventorySummary,
  title = "แดชบอร์ดผู้บริหาร",
  subtitle = "ภาพรวมองค์กร สุขภาพบุคลากร ชั่วโมงเงินเดือน ประสิทธิภาพสาขา และสัญญาณคลังสินค้า",
  exportHref = "#report-export",
}: {
  userName: string
  data: CeoDashboardData
  inventorySummary: InventoryDashboardSummary
  title?: string
  subtitle?: string
  exportHref?: string
}) {
  const totalPayrollHours = roundPayrollHours(
    data.regularHoursMonth + data.otHoursMonth + data.sickHoursMonth
  )

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden md:gap-2.5 [@media(max-height:800px)]:gap-1.5">
      <div className="flex shrink-0 items-start justify-between gap-2">
        <HeroBanner compact userName={userName} title={title} subtitle={subtitle} />
        <Button render={<Link href={exportHref} />} size="sm" className="shrink-0 gap-1.5">
          <Download className="size-3.5" />
          Export Report
        </Button>
      </div>

      <div className="grid shrink-0 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 md:gap-2.5">
        <KpiCard
          compact
          iconSize="lg"
          label="Total Employees"
          value={data.totalEmployees.toLocaleString()}
          detail="Active workforce"
          icon={Users}
        />
        <KpiCard
          compact
          iconSize="lg"
          label="Present Today"
          value={data.presentToday.toLocaleString()}
          detail={`${data.presentRate}% of total`}
          icon={UserCheck}
          accent="success"
        />
        <KpiCard
          compact
          iconSize="lg"
          label="On Leave"
          value={data.onLeaveToday}
          detail={`${data.onLeaveRate}% of total`}
          icon={CalendarDays}
          accent="info"
        />
        <KpiCard
          compact
          iconSize="lg"
          label="Pending Approvals"
          value={data.pendingHrApprovals}
          detail="Leave · OT · Attendance"
          icon={ListChecks}
          accent="warning"
        />
        <KpiCard
          compact
          iconSize="lg"
          label="Payroll Hours"
          value={`${formatPayrollHours(totalPayrollHours)}h`}
          detail={
            data.payrollHoursChangePct !== null
              ? `${data.payrollPeriodLabel} · ${data.payrollHoursChangePct >= 0 ? "+" : ""}${data.payrollHoursChangePct}% MoM`
              : data.payrollPeriodLabel
          }
          icon={Wallet}
        />
        <KpiCard
          compact
          iconSize="lg"
          label="Branches"
          value={data.branchCount}
          detail={`${data.pendingOnboarding} onboarding`}
          icon={Building2}
          accent="purple"
        />
      </div>

      <div className="grid min-h-0 flex-1 gap-2 md:gap-2.5 lg:grid-cols-3">
        <WidgetCard compact title="Attendance Overview" href="/admin/attendance">
          <CeoAttendanceDonut
            data={data.attendanceDonut}
            presentRate={data.presentRate}
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            Today: {data.presentToday} in · {data.lateToday} late · {data.absentToday}{" "}
            absent
          </p>
          <div className="mt-1 border-t border-border/60 pt-1.5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              7-day trend
            </p>
            <CeoWeekTrend data={data.weekTrend} />
          </div>
        </WidgetCard>

        <WidgetCard compact title="Leave Requests" href="/admin/leaves" actionLabel="View All">
          {data.recentLeaveRows.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No leave requests
            </p>
          ) : (
            <>
              <ul className="divide-y divide-border/60">
                {data.recentLeaveRows.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-start justify-between gap-2 py-1.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{row.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {row.department} · {row.dates}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{row.type}</p>
                    </div>
                    <StatusPill
                      label={row.status}
                      variant={LEAVE_STATUS_VARIANT[row.status]}
                    />
                  </li>
                ))}
              </ul>
              <div className="mt-1.5 flex flex-wrap gap-2 border-t border-border/60 pt-1.5 text-[10px] text-muted-foreground">
                <span>Pending {data.pendingLeaves}</span>
                <span>Approved {data.approvedLeaves}</span>
                <span>Rejected {data.rejectedLeaves}</span>
                <span>Total {data.totalLeaveRequests}</span>
              </div>
            </>
          )}
        </WidgetCard>

        <WidgetCard compact title="Payroll Summary" href="/admin/payroll">
          <p className="mb-1 text-[10px] text-muted-foreground">
            {data.payrollPeriodLabel} · Regular + OT + Sick
            {data.payrollHoursChangePct !== null ? (
              <span
                className={cn(
                  "ml-1 font-medium tabular-nums",
                  data.payrollHoursChangePct >= 0
                    ? "text-emerald-600"
                    : "text-red-600"
                )}
              >
                ({data.payrollHoursChangePct >= 0 ? "+" : ""}
                {data.payrollHoursChangePct}% MoM)
              </span>
            ) : null}
          </p>
          <CeoPayrollDonut data={data.payrollBreakdown} totalHours={totalPayrollHours} />
          <Link
            href="/admin/payroll"
            className="mt-1 block text-center text-[10px] font-medium text-brand-red hover:underline"
          >
            View Payroll Report
          </Link>
        </WidgetCard>
      </div>

      <div className="grid min-h-0 flex-1 gap-2 md:gap-2.5 lg:grid-cols-4">
        <WidgetCard compact title="Branch Performance" href="/admin/branches">
          {data.branchRows.length === 0 ? (
            <p className="py-4 text-xs text-muted-foreground">No branches configured</p>
          ) : (
            <div className="overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b text-left text-[10px] text-muted-foreground">
                    <th className="pb-1 pr-1 font-medium">Branch</th>
                    <th className="pb-1 pr-1 font-medium">Staff</th>
                    <th className="pb-1 pr-1 font-medium">Present</th>
                    <th className="pb-1 pr-1 font-medium">OT</th>
                    <th className="pb-1 font-medium">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.branchRows.slice(0, 5).map((row) => (
                    <tr key={row.id} className="border-b border-border/40">
                      <td className="max-w-[5rem] truncate py-1 pr-1 font-medium">
                        {row.name}
                      </td>
                      <td className="py-1 pr-1 tabular-nums">{row.headcount}</td>
                      <td className="py-1 pr-1 tabular-nums">{row.presentToday}</td>
                      <td className="py-1 pr-1 tabular-nums">{row.otHours}h</td>
                      <td className="py-1">
                        <div className="flex items-center gap-1">
                          <div className="h-1.5 w-10 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-300",
                                row.rate >= 80
                                  ? "bg-emerald-500"
                                  : row.rate >= 60
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                              )}
                              style={{ width: `${row.rate}%` }}
                            />
                          </div>
                          <span className="tabular-nums">{row.rate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </WidgetCard>

        <InventoryLowStockWidget summary={inventorySummary} />
        <InventoryPendingInboundWidget summary={inventorySummary} />
        <InventoryZeroStockWidget summary={inventorySummary} />
      </div>
    </div>
  )
}
