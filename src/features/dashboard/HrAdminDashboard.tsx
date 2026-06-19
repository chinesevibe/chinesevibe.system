import { Suspense } from "react"
import Link from "next/link"
import {
  CircleAlert,
  Clock,
  FileText,
  MessageCircleWarning,
  ShieldAlert,
  Users,
} from "lucide-react"

import { HeroBanner } from "@/components/brand/HeroBanner"
import { KpiCard } from "@/components/brand/KpiCard"
import { COMPLIANCE_KPI_WINDOW_DAYS } from "@/features/dashboard/compliance-data"
import { DashboardWidgetsAsync } from "@/features/dashboard/DashboardWidgetsAsync"
import { DashboardWidgetsSkeleton } from "@/features/dashboard/DashboardWidgetsSkeleton"
import { getDashboardStats } from "@/features/dashboard/data"

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
  const stats = await getDashboardStats()
  const compliance = stats.expiring
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
            value={stats.pendingApprovalCount}
            detail="ลา · OT · เวลางาน · ลงทะเบียน"
            icon={MessageCircleWarning}
            accent={stats.pendingApprovalCount > 0 ? "purple" : "success"}
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
            value={stats.pendingDocumentCount}
            detail="คำขอเอกสารรอดำเนินการ"
            icon={FileText}
            accent={stats.pendingDocumentCount > 0 ? "info" : "default"}
          />
        </KpiLink>
        <KpiLink href="/admin/complaints?status=open">
          <KpiCard
            compact
            iconSize="lg"
            label="เรื่องร้องเรียน"
            value={stats.openComplaintCount}
            detail="สถานะเปิดอยู่"
            icon={CircleAlert}
            accent={stats.openComplaintCount > 0 ? "warning" : "success"}
          />
        </KpiLink>
      </div>

      <Suspense fallback={<DashboardWidgetsSkeleton />}>
        <DashboardWidgetsAsync
          attendanceByDay={stats.attendanceByDay}
          attendanceTitle={`Today: ${stats.checkedInToday} in · ${stats.lateToday} late · ${stats.absentToday} absent`}
          leavesByStatus={stats.leavesByStatus}
        />
      </Suspense>
    </div>
  )
}
