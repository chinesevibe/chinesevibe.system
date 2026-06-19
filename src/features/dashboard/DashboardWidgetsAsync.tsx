import Link from "next/link"
import { Bell, CalendarCheck, Clock, FileText, UserPlus, Wallet } from "lucide-react"

import { WidgetCard } from "@/components/brand/WidgetCard"
import {
  AttendanceIssuesList,
  ComplianceExpiringList,
  DocumentApprovalsList,
  OpenComplaintsList,
  RecentHrTicketsList,
} from "@/features/dashboard/DashboardWidgetLists"
import { AttendanceTrendBars } from "@/features/dashboard/AttendanceTrendBars"
import { LeaveDonut } from "@/features/dashboard/LeaveDonut"
import { OnboardingDonut } from "@/features/dashboard/OnboardingDonut"
import { getDashboardWidgets } from "@/features/dashboard/widgets-data"
import { getPayrollHourReport } from "@/features/payroll/data"
import { formatThaiMonthYear } from "@/lib/datetime/thailand"

const QUICK_ACTIONS = [
  { label: "เพิ่มพนักงาน", href: "/admin/employees/new", icon: UserPlus },
  { label: "อนุมัติลา", href: "/admin/leaves", icon: CalendarCheck },
  { label: "แจ้งเตือน", href: "/admin/alerts", icon: Bell },
  { label: "Payroll", href: "/admin/payroll", icon: Wallet },
  { label: "จัดการเอกสาร", href: "/admin/documents", icon: FileText },
  { label: "รายงานเข้างาน", href: "/admin/attendance", icon: Clock },
] as const

function getPayrollSnapshot(report: Awaited<ReturnType<typeof getPayrollHourReport>>) {
  let totalHours = 0
  for (const row of report) {
    totalHours += row.regular + row.overtime + row.sick
  }
  return {
    employeeCount: report.length,
    totalHours: Math.round(totalHours * 10) / 10,
  }
}

export async function DashboardWidgetsAsync({
  attendanceByDay,
  attendanceTitle,
  leavesByStatus,
}: {
  attendanceByDay: Array<{ day: string; count: number }>
  attendanceTitle: string
  leavesByStatus: Array<{ status: string; count: number }>
}) {
  const now = new Date()
  const payrollMonthLabel = formatThaiMonthYear(now)
  const [widgets, payrollReport] = await Promise.all([
    getDashboardWidgets(),
    getPayrollHourReport(now.getFullYear(), now.getMonth() + 1),
  ])
  const payroll = getPayrollSnapshot(payrollReport)

  return (
    <>
      <div className="grid min-h-0 flex-1 gap-2 md:gap-3 min-[1024px]:grid-cols-2">
        <WidgetCard
          compact
          title="งานรอดำเนินการ"
          href="/admin/leaves?status=pending"
          actionLabel="ดูทั้งหมด"
          footerHref="/admin/leaves?status=pending"
          footerLabel="ไปคิวอนุมัติ"
        >
          <RecentHrTicketsList items={widgets.pendingApprovals} />
        </WidgetCard>

        <WidgetCard
          compact
          title="Compliance ใกล้ครบ"
          href="/admin/alerts"
          actionLabel="ดูทั้งหมด"
          footerHref="/admin/alerts?tab=visa"
          footerLabel="ไปหน้าแจ้งเตือน"
        >
          <ComplianceExpiringList items={widgets.complianceReminders} />
        </WidgetCard>
      </div>

      <div className="grid min-h-0 flex-1 gap-2 md:gap-3 min-[1024px]:grid-cols-4">
        <WidgetCard
          compact
          title="Employee Onboarding"
          href="/admin/employees?status=onboarding"
        >
          <OnboardingDonut compact data={widgets.onboardingDonut} />
        </WidgetCard>

        <WidgetCard
          compact
          title="Attendance Issues"
          href="/admin/attendance"
          footerHref="/admin/attendance"
          footerLabel="Go to Attendance"
        >
          <AttendanceIssuesList items={widgets.attendanceIssues} />
        </WidgetCard>

        <WidgetCard
          compact
          title="Pending Documents"
          href="/admin/documents"
          footerHref="/admin/documents"
          footerLabel="Go to Documents"
        >
          <DocumentApprovalsList items={widgets.pendingDocuments} />
        </WidgetCard>

        <WidgetCard
          compact
          title="เรื่องร้องเรียน"
          href="/admin/complaints?status=open"
          footerHref="/admin/complaints?status=open"
          footerLabel="ดูเรื่องร้องเรียน"
        >
          <OpenComplaintsList items={widgets.complaintReminders} />
        </WidgetCard>
      </div>

      <div className="grid min-h-0 flex-1 gap-2 md:gap-3 min-[1024px]:grid-cols-4">
        <WidgetCard compact title="Leave Overview" href="/admin/leaves">
          <LeaveDonut compact data={leavesByStatus} />
        </WidgetCard>

        <WidgetCard compact title="Attendance (7 days)" href="/admin/attendance">
          <AttendanceTrendBars title={attendanceTitle} data={attendanceByDay} />
        </WidgetCard>

        <WidgetCard compact title="Payroll เดือนนี้" href="/admin/payroll">
          <div className="flex flex-col gap-2 py-1">
            <p className="text-3xl font-semibold tabular-nums">
              {payroll.employeeCount > 0
                ? payroll.employeeCount.toLocaleString()
                : "—"}
            </p>
            <p className="text-sm text-muted-foreground">
              {payroll.employeeCount > 0
                ? `${payroll.totalHours.toLocaleString()} ชม. บันทึกแล้ว`
                : "ยังไม่มีชม.บันทึก"}
            </p>
            <p className="text-xs text-muted-foreground">{payrollMonthLabel}</p>
          </div>
        </WidgetCard>

        <WidgetCard compact title="Quick Actions">
          <div className="grid grid-cols-3 gap-1.5">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex flex-col items-center gap-1 rounded-lg border border-border/80 bg-muted/20 px-1 py-1.5 text-center transition-colors hover:border-brand-red/40 hover:bg-brand-red/5"
              >
                <action.icon className="size-7 text-brand-red" strokeWidth={1.6} />
                <span className="text-[9px] font-medium leading-tight">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </WidgetCard>
      </div>
    </>
  )
}
