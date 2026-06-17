import Link from "next/link"
import {
  BarChart3,
  Bell,
  CalendarCheck,
  CircleAlert,
  Clock,
  FileText,
  Megaphone,
  MessageCircleWarning,
  Network,
  Settings,
  ShieldAlert,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"

import { HeroBanner } from "@/components/brand/HeroBanner"
import { KpiCard } from "@/components/brand/KpiCard"
import { WidgetCard } from "@/components/brand/WidgetCard"
import { COMPLIANCE_KPI_WINDOW_DAYS } from "@/features/dashboard/compliance-data"
import { getDashboardStats } from "@/features/dashboard/data"
import {
  AttendanceIssuesList,
  ComplianceExpiringList,
  DocumentApprovalsList,
  OpenComplaintsList,
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
  { label: "แจ้งเตือน", href: "/admin/alerts", icon: Bell },
  { label: "Payroll", href: "/admin/payroll", icon: Wallet },
  { label: "จัดการเอกสาร", href: "/admin/documents", icon: FileText },
  { label: "รายงานเข้างาน", href: "/admin/attendance", icon: Clock },
]

function KpiLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl transition-colors hover:ring-2 hover:ring-brand-red/20"
    >
      {children}
    </Link>
  )
}

export async function HrAdminDashboard({ userName }: { userName: string }) {
  const [stats, widgets] = await Promise.all([
    getDashboardStats(),
    getDashboardWidgets(),
  ])

  const payrollMonthLabel = formatThaiMonthYear()
  const compliance = widgets.complianceCounts
  const complianceDetail = [
    compliance.expired > 0 ? `หมดอายุ ${compliance.expired}` : null,
    compliance.probation > 0 ? `ทดลองงาน ${compliance.probation}` : null,
    compliance.visa > 0 ? `วีซ่า ${compliance.visa}` : null,
    compliance.workPermit > 0 ? `WP ${compliance.workPermit}` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden md:gap-3 [@media(max-height:800px)]:gap-1.5">
      <HeroBanner
        compact
        userName={userName}
        title="แดชบอร์ด HR"
        subtitle="งานรอดำเนินการ · compliance · เข้างานวันนี้"
      />

      <div className="grid shrink-0 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 md:gap-3">
        <KpiLink href="/admin/employees">
          <KpiCard
            compact
            iconSize="lg"
            label="พนักงาน Active"
            value={stats.totalActiveEmployees.toLocaleString()}
            detail="Headcount ปัจจุบัน"
            icon={Users}
          />
        </KpiLink>
        <KpiLink href="/admin/attendance">
          <KpiCard
            compact
            iconSize="lg"
            label="เช็คอินวันนี้"
            value={stats.checkedInToday.toLocaleString()}
            detail={`${stats.lateToday} สาย · ${stats.absentToday} ขาด`}
            icon={Clock}
            accent={
              stats.lateToday + stats.absentToday > 0 ? "warning" : "success"
            }
          />
        </KpiLink>
        <KpiLink href="/admin/leaves?status=pending">
          <KpiCard
            compact
            iconSize="lg"
            label="รออนุมัติ"
            value={widgets.pendingApprovalCount}
            detail="ลา · OT · เวลางาน · ลงทะเบียน"
            icon={MessageCircleWarning}
            accent={widgets.pendingApprovalCount > 0 ? "purple" : "success"}
          />
        </KpiLink>
        <KpiLink href="/admin/alerts">
          <KpiCard
            compact
            iconSize="lg"
            label="Compliance ใกล้ครบ"
            value={compliance.total}
            detail={
              complianceDetail ||
              `ใกล้ครบ ${COMPLIANCE_KPI_WINDOW_DAYS} วัน หรือหมดอายุแล้ว`
            }
            icon={ShieldAlert}
            accent={compliance.total > 0 ? "warning" : "success"}
          />
        </KpiLink>
        <KpiLink href="/admin/documents">
          <KpiCard
            compact
            iconSize="lg"
            label="เอกสารค้าง"
            value={widgets.pendingDocumentCount}
            detail="คำขอเอกสารรอดำเนินการ"
            icon={FileText}
            accent={widgets.pendingDocumentCount > 0 ? "info" : "default"}
          />
        </KpiLink>
        <KpiLink href="/admin/complaints?status=open">
          <KpiCard
            compact
            iconSize="lg"
            label="เรื่องร้องเรียน"
            value={widgets.openComplaintCount}
            detail="สถานะเปิดอยู่"
            icon={CircleAlert}
            accent={widgets.openComplaintCount > 0 ? "warning" : "success"}
          />
        </KpiLink>
      </div>

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
        <WidgetCard
          compact
          title="Leave Overview"
          href="/admin/leaves"
          footerHref="/admin/leaves"
          footerLabel="Go to Leaves"
        >
          <LeaveDonut compact data={stats.leavesByStatus} />
        </WidgetCard>

        <WidgetCard compact title="Attendance (7 days)" href="/admin/attendance">
          <AttendanceTrendBars
            title={`Today: ${stats.checkedInToday} in · ${stats.lateToday} late · ${stats.absentToday} absent`}
            data={stats.attendanceByDay}
          />
        </WidgetCard>

        <WidgetCard compact title="Payroll เดือนนี้" href="/admin/payroll">
          <div className="flex flex-col gap-2 py-1">
            <p className="text-3xl font-semibold tabular-nums">
              {stats.payrollEmployeeCount > 0
                ? stats.payrollEmployeeCount.toLocaleString()
                : "—"}
            </p>
            <p className="text-sm text-muted-foreground">
              {stats.payrollEmployeeCount > 0
                ? `${stats.payrollTotalHours.toLocaleString()} ชม. บันทึกแล้ว`
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
    </div>
  )
}
