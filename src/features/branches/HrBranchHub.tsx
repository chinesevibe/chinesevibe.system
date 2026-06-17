import Link from "next/link"
import {
  Building2,
  CalendarCheck,
  Clock,
  MapPin,
  Timer,
  Users,
} from "lucide-react"

import { KpiCard } from "@/components/brand/KpiCard"
import { WidgetCard } from "@/components/brand/WidgetCard"
import type { BranchDashboardData } from "@/features/branch-dashboard/data"
import { BranchEmployeeAlertIcons } from "@/features/branches/BranchEmployeeAlertIcons"
import { BranchDeleteButton } from "@/features/branches/BranchDeleteButton"
import { BranchLocationEditor } from "@/features/branches/BranchLocationEditor"
import { BranchManagerSelect } from "@/features/branches/BranchManagerSelect"
import type { BranchManagerCandidate } from "@/features/branches/manager-candidates"
import type {
  BranchDetail,
  BranchEmployeeWithAlerts,
} from "@/features/branches/branch-hub-data"
import { roleDisplayLabel } from "@/lib/auth/labels"
import { branchAdminSubPath } from "@/lib/branches/branch-slug"
import { branchGeofenceBadgeText, branchGeofenceReady } from "@/lib/geofence/status"

const sectionLinks = (branch: BranchDetail) =>
  [
    {
      label: "Attendance",
      href: `/admin/attendance?branch_id=${encodeURIComponent(branch.id)}`,
      icon: Clock,
    },
    {
      label: "Leave Management",
      href: branchAdminSubPath(branch, "leaves"),
      icon: CalendarCheck,
    },
    {
      label: "Approve OT",
      href: branchAdminSubPath(branch, "overtime"),
      icon: Timer,
    },
  ] as const

type OvertimeRow = {
  id: string
  work_date: string
  start_time: string | null
  end_time: string | null
  approval_status: string
  employee_name: string
}

function mapOvertimeRows(
  rows: Array<Record<string, unknown>>
): OvertimeRow[] {
  return rows.map((r) => {
    const emp = Array.isArray(r.hr_employees)
      ? r.hr_employees[0]
      : r.hr_employees
    return {
      id: r.id as string,
      work_date: r.work_date as string,
      start_time: (r.start_time as string | null) ?? null,
      end_time: (r.end_time as string | null) ?? null,
      approval_status: r.approval_status as string,
      employee_name: (emp as { name?: string } | null)?.name ?? "—",
    }
  })
}

export function HrBranchHub({
  branch,
  dashboard,
  employees,
  overtimeQueue,
  managerCandidates,
  readOnly = false,
}: {
  branch: BranchDetail
  dashboard: BranchDashboardData
  employees: BranchEmployeeWithAlerts[]
  overtimeQueue: Array<Record<string, unknown>>
  managerCandidates: BranchManagerCandidate[]
  readOnly?: boolean
}) {
  const links = sectionLinks(branch)
  const overtimeRows = mapOvertimeRows(overtimeQueue)
  const pendingOtTotal = employees.reduce((s, e) => s + e.alerts.pendingOvertime, 0)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Building2 className="size-5 shrink-0 text-brand-red" />
              <h1 className="text-lg font-bold">{branch.name}</h1>
              {branch.code ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  รหัส {branch.code}
                </span>
              ) : null}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  branchGeofenceReady(branch)
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-900"
                }`}
              >
                {branchGeofenceBadgeText(branch)}
              </span>
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              {branch.address?.trim() ? (
                <span>{branch.address}</span>
              ) : (
                <span className="italic">ยังไม่ระบุที่อยู่</span>
              )}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">ผู้ดูแลสาขา (Manager):</span>
              <BranchManagerSelect
                branchId={branch.id}
                value={branch.manager_employee_id}
                candidates={managerCandidates}
                readOnly={readOnly}
              />
            </div>
            {!readOnly ? <BranchLocationEditor branch={branch} /> : null}
          </div>
          <div className="flex flex-col items-end gap-2">
            {!readOnly ? (
              <BranchDeleteButton branchId={branch.id} branchName={branch.name} />
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
            {links.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/30 px-3 py-1.5 text-xs font-medium hover:bg-muted/60"
                >
                  <Icon className="size-3.5" />
                  {item.label}
                </Link>
              )
            })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          compact
          label="พนักงานในสาขา"
          value={employees.length}
          detail={`Active ${dashboard.headcount}`}
          icon={Users}
        />
        <KpiCard
          compact
          label="เข้างานวันนี้"
          value={dashboard.presentToday}
          detail={`สาย ${dashboard.lateToday} · ขาด ${dashboard.absentToday}`}
          icon={Clock}
        />
        <KpiCard
          compact
          label="ลาวันนี้"
          value={dashboard.onLeaveToday}
          detail="อนุมัติแล้ว"
          icon={CalendarCheck}
        />
        <KpiCard
          compact
          label="ลารออนุมัติ"
          value={dashboard.pendingLeaves}
          detail="Leave Management"
          icon={CalendarCheck}
          accent={dashboard.pendingLeaves > 0 ? "warning" : undefined}
        />
        <KpiCard
          compact
          label="OT รออนุมัติ"
          value={pendingOtTotal}
          detail={`${dashboard.otHoursMonth} ชม. สะสมเดือนนี้`}
          icon={Timer}
          accent={pendingOtTotal > 0 ? "warning" : undefined}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="min-h-0 xl:col-span-2">
        <WidgetCard title="พนักงานในสาขา">
          <section id="employees" className="scroll-mt-4">
            {employees.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                ยังไม่มีพนักงานในสาขานี้
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">ชื่อ</th>
                      <th className="px-3 py-2 font-medium">รายละเอียด</th>
                      <th className="px-3 py-2 font-medium">เข้างาน (เดือนนี้)</th>
                      <th className="px-3 py-2 font-medium">ลา (เดือนนี้)</th>
                      <th className="px-3 py-2 font-medium">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr
                        key={emp.id}
                        className="border-b border-border/50 last:border-0 hover:bg-muted/20"
                      >
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Link
                              href={`/admin/employees/${emp.id}`}
                              className="font-medium text-brand-red hover:underline"
                            >
                              {emp.name}
                            </Link>
                            <BranchEmployeeAlertIcons alerts={emp.alerts} inline />
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          <div>
                            {[emp.department, emp.position].filter(Boolean).join(" · ") ||
                              "—"}
                          </div>
                          <div className="mt-0.5">
                            {emp.employee_code ? `รหัส ${emp.employee_code}` : null}
                            {emp.employee_code && emp.phone ? " · " : null}
                            {emp.phone ?? null}
                            {emp.role !== "employee" ? (
                              <span className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px]">
                                {roleDisplayLabel(
                                  emp.role as Parameters<typeof roleDisplayLabel>[0]
                                )}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {emp.stats.attendanceDaysThisMonth} วัน
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {emp.stats.leaveDaysThisMonth} วัน
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {emp.status === "inactive" ? "รออนุมัติ" : "Active"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </WidgetCard>
        </div>

        <WidgetCard title="คำขอ OT รออนุมัติ">
          {overtimeRows.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              ไม่มีคำขอ OT รออนุมัติ
            </p>
          ) : (
            <ul className="divide-y divide-border/60 text-sm">
              {overtimeRows.slice(0, 8).map((ot) => (
                <li key={ot.id} className="flex flex-col gap-0.5 py-2 first:pt-0">
                  <span className="font-medium">{ot.employee_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {ot.work_date}
                    {ot.start_time && ot.end_time
                      ? ` · ${ot.start_time}–${ot.end_time}`
                      : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={branchAdminSubPath(branch, "overtime")}
            className="mt-3 inline-block text-xs font-medium text-brand-red hover:underline"
          >
            ดูทั้งหมด →
          </Link>
        </WidgetCard>
      </div>
    </div>
  )
}
