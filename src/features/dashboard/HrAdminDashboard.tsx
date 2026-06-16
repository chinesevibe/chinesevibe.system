import Link from "next/link"
import {
  BarChart3,
  CalendarCheck,
  CircleAlert,
  Clock,
  FileText,
  Loader2,
  Megaphone,
  MessageCircleWarning,
  Network,
  Settings,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"

import { HeroBanner } from "@/components/brand/HeroBanner"
import { KpiCard } from "@/components/brand/KpiCard"
import { StatusPill } from "@/components/brand/StatusPill"
import { WidgetCard } from "@/components/brand/WidgetCard"
import { getDashboardStats } from "@/features/dashboard/data"
import {
  AttendanceExceptionsList,
  ComplianceRemindersList,
  DocumentApprovalsList,
  PendingRegistrationsList,
  RecentHrTicketsList,
} from "@/features/dashboard/DashboardWidgetLists"
import { AttendanceTrendBars } from "@/features/dashboard/AttendanceTrendBars"
import { OnboardingDonut } from "@/features/dashboard/OnboardingDonut"
import { LeaveDonut } from "@/features/dashboard/LeaveDonut"
import { getDashboardWidgets } from "@/features/dashboard/widgets-data"
import { formatThaiMonthYear } from "@/lib/datetime/thailand"

const QUICK_ACTIONS: Array<{
  label: string
  href: string
  icon: LucideIcon
}> = [
  { label: "เพิ่มพนักงาน", href: "/admin/employees/new", icon: UserPlus },
  { label: "อนุมัติลา", href: "/admin/leaves", icon: CalendarCheck },
  { label: "Payroll", href: "/admin/payroll", icon: Wallet },
  { label: "จัดการเอกสาร", href: "/admin/documents", icon: FileText },
  { label: "สร้างประกาศ", href: "/admin/announcements", icon: Megaphone },
  { label: "รายงาน", href: "/admin/report", icon: BarChart3 },
  { label: "โครงสร้างองค์กร", href: "/admin/organization", icon: Network },
  { label: "รายงานเข้างาน", href: "/admin/attendance", icon: Clock },
  { label: "ตั้งค่า", href: "/admin/settings", icon: Settings },
]

const NEW_HIRE_STATUS: Record<
  "completed" | "in_progress" | "pending",
  { label: string; variant: "approved" | "pending" | "info" }
> = {
  completed: { label: "เสร็จสิ้น", variant: "approved" },
  in_progress: { label: "รอกำหนดสาขา", variant: "info" },
  pending: { label: "รออนุมัติ", variant: "pending" },
}

export async function HrAdminDashboard({ userName }: { userName: string }) {
  const [stats, widgets] = await Promise.all([
    getDashboardStats(),
    getDashboardWidgets(),
  ])

  const payrollMonthLabel = formatThaiMonthYear()

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden md:gap-3 [@media(max-height:800px)]:gap-1.5">
      <HeroBanner
        compact
        userName={userName}
        title="แดชบอร์ด HR"
        subtitle="จัดการพนักงาน การเข้างาน ลา OT และงาน HR ในที่เดียว"
      />

      <div className="grid shrink-0 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 md:gap-3">
        <KpiCard
          compact
          iconSize="lg"
          label="Total Employees"
          value={stats.totalActiveEmployees.toLocaleString()}
          detail="Active headcount"
          icon={Users}
        />
        <KpiCard
          compact
          iconSize="lg"
          label="Pending Registration"
          value={widgets.pendingRegistrationCount}
          detail="Self-registrations awaiting approval"
          icon={UserPlus}
          accent={widgets.pendingRegistrationCount > 0 ? "warning" : "success"}
        />
        <KpiCard
          compact
          iconSize="lg"
          label="Attendance Exceptions"
          value={widgets.exceptionCount}
          detail="Require attention"
          icon={CircleAlert}
          accent="warning"
        />
        <KpiCard
          compact
          iconSize="lg"
          label="Leave Approvals Pending"
          value={stats.pendingLeaves}
          detail="Requests awaiting approval"
          icon={CalendarCheck}
        />
        <KpiCard
          compact
          iconSize="lg"
          label="Payroll Processing"
          value={
            stats.payrollEmployeeCount > 0
              ? stats.payrollEmployeeCount.toLocaleString()
              : "—"
          }
          detail={
            stats.payrollEmployeeCount > 0
              ? `${stats.payrollTotalHours.toLocaleString()}h บันทึกแล้ว · ${payrollMonthLabel}`
              : `ยังไม่มีชม.บันทึก · ${payrollMonthLabel}`
          }
          icon={Loader2}
          accent="info"
        />
        <KpiCard
          compact
          iconSize="lg"
          label="Pending Approvals"
          value={widgets.pendingApprovalCount}
          detail="รายการรอการอนุมัติทั้งหมด"
          icon={MessageCircleWarning}
          accent={widgets.pendingApprovalCount > 0 ? "purple" : "success"}
        />
      </div>

      <div className="grid min-h-0 flex-1 gap-2 md:gap-3 min-[1024px]:grid-cols-4">
        <WidgetCard
          compact
          title="Employee Onboarding Status"
          href="/admin/employees?status=onboarding"
        >
          {widgets.pendingRegistrationCount > 0 ? (
            <div className="mb-3 rounded-lg border border-amber-200/80 bg-amber-50/80 px-2.5 py-2 dark:border-amber-900/50 dark:bg-amber-950/30">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                รออนุมัติลงทะเบียน ({widgets.pendingRegistrationCount})
              </p>
              <PendingRegistrationsList items={widgets.pendingRegistrations} />
            </div>
          ) : null}
          <OnboardingDonut compact data={widgets.onboardingDonut} />
          <div className="mt-2 border-t border-border/60 pt-2">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              New Hires
            </p>
            {widgets.newHires.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent hires</p>
            ) : (
              <ul className="space-y-2">
                {widgets.newHires.map((hire) => {
                  const st = NEW_HIRE_STATUS[hire.status]
                  return (
                    <li
                      key={hire.id}
                      className="flex items-start justify-between gap-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{hire.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {hire.position ?? "—"}
                          {hire.contractStart ? ` · ${hire.contractStart}` : ""}
                        </p>
                      </div>
                      <StatusPill label={st.label} variant={st.variant} />
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </WidgetCard>

        <WidgetCard
          compact
          title="Pending Document Approvals"
          href="/admin/documents"
          footerHref="/admin/documents"
          footerLabel="Go to Documents"
        >
          <DocumentApprovalsList items={widgets.pendingDocuments} />
        </WidgetCard>

        <WidgetCard
          compact
          title="Attendance Exceptions"
          href="/admin/attendance"
          footerHref="/admin/attendance"
          footerLabel="Go to Attendance"
        >
          <AttendanceExceptionsList items={widgets.exceptions} />
        </WidgetCard>

        <WidgetCard
          compact
          title="Recent HR Tickets"
          href="/admin/leaves?status=pending"
          footerHref="/admin/leaves?status=pending"
          footerLabel="ดูรายการรออนุมัติ"
        >
          <RecentHrTicketsList items={widgets.pendingApprovals} />
        </WidgetCard>
      </div>

      <div className="grid min-h-0 flex-1 gap-2 md:gap-3 min-[1024px]:grid-cols-4">
        <WidgetCard
          compact
          title="Leave Overview"
          href="/admin/leaves"
          footerHref="/admin/leaves"
          footerLabel="Go to Leaves"
        >
          <LeaveDonut compact data={stats.leavesByStatus} />
        </WidgetCard>

        <WidgetCard
          compact
          title="Compliance Reminders"
          href="/admin/complaints?status=open"
          footerHref="/admin/complaints?status=open"
          footerLabel="ดูเรื่องร้องเรียน"
        >
          <ComplianceRemindersList items={widgets.complaintReminders} />
        </WidgetCard>

        <WidgetCard compact title="Attendance (7 days)" href="/admin/attendance">
          <AttendanceTrendBars
            title={`Today: ${stats.checkedInToday} in · ${stats.lateToday} late · ${stats.absentToday} absent`}
            data={stats.attendanceByDay}
          />
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
    </div>
  )
}
