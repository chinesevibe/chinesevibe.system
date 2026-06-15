import Link from "next/link"
import {
  Building2,
  CalendarCheck,
  CalendarDays,
  Clock,
  ListChecks,
  Megaphone,
  Timer,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react"

import { DevelopmentEmptyState } from "@/components/brand/DevelopmentEmptyState"
import { HeroBanner } from "@/components/brand/HeroBanner"
import { KpiCard } from "@/components/brand/KpiCard"
import { StatusPill } from "@/components/brand/StatusPill"
import { WidgetCard } from "@/components/brand/WidgetCard"
import {
  CeoAttendanceDonut,
  CeoWeekTrend,
} from "@/features/ceo-dashboard/charts"
import { cn } from "@/lib/utils"

import type { BranchDashboardData } from "./data"

const QUICK_ACTIONS: readonly {
  label: string
  href: string
  icon: typeof Clock
}[] = []

const ACTIVITY_ICONS: Record<string, { icon: LucideIcon; className: string }> = {
  leave: { icon: CalendarDays, className: "text-sky-600 bg-sky-100" },
  attendance: { icon: Clock, className: "text-amber-600 bg-amber-100" },
  announcement: { icon: Megaphone, className: "text-brand-red bg-brand-red/10" },
}

export function BranchManagerDashboard({
  userName,
  data,
  unassigned = false,
}: {
  userName: string
  data: BranchDashboardData
  unassigned?: boolean
}) {
  const branchLabel = data.branch?.name ?? "Your Branch"
  const leaveRate =
    data.headcount > 0
      ? Math.round((data.onLeaveToday / data.headcount) * 1000) / 10
      : 0
  const lateRate =
    data.headcount > 0
      ? Math.round((data.lateToday / data.headcount) * 1000) / 10
      : 0

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-2 md:gap-2.5 [@media(max-height:800px)]:gap-1.5">
      <HeroBanner
        compact
        userName={userName}
        title="แดชบอร์ดสาขา"
        subtitle={
          unassigned
            ? "ยังไม่ได้มอบหมายสาขา — ติดต่อ HR ให้ตั้ง Role Branch Manager และผูกสาขา"
            : `${branchLabel} — สรุปภาพรวมสาขาและรายการรออนุมัติ`
        }
      />

      {unassigned ? (
        <p className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          แสดง Dashboard ตัวอย่าง — ข้อมูลจริงจะปรากฏเมื่อ HR มอบหมายสาขาให้แล้ว
        </p>
      ) : null}

      <div className="grid shrink-0 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 md:gap-2.5">
        <KpiCard
          compact
          iconSize="lg"
          label="Branch Headcount"
          value={data.headcount}
          detail="Active employees"
          icon={Users}
        />
        <KpiCard
          compact
          iconSize="lg"
          label="Present Today"
          value={data.presentToday}
          detail={`${data.presentRate}% of total`}
          icon={UserCheck}
          accent="success"
        />
        <KpiCard
          compact
          iconSize="lg"
          label="Late Arrivals"
          value={data.lateToday}
          detail={`${lateRate}% of total`}
          icon={Clock}
          accent="warning"
        />
        <KpiCard
          compact
          iconSize="lg"
          label="On Leave"
          value={data.onLeaveToday}
          detail={`${leaveRate}% of total`}
          icon={CalendarDays}
          accent="info"
        />
        <KpiCard
          compact
          iconSize="lg"
          label="OT Hours (Month)"
          value={`${data.otHoursMonth}h`}
          detail="Approved overtime ledger"
          icon={Timer}
          accent="purple"
        />
        <KpiCard
          compact
          iconSize="lg"
          label="Pending Approvals"
          value={data.pendingAttendance + data.pendingLeaves}
          detail={`${data.pendingAttendance} att. · ${data.pendingLeaves} leave`}
          icon={ListChecks}
          accent="warning"
        />
      </div>

      <div className="grid shrink-0 gap-2 md:gap-2.5 lg:grid-cols-3">
        <WidgetCard compact title="Today's Attendance">
          {data.attendanceDonut.length === 0 ? (
            <DevelopmentEmptyState
              compact
              icon={Clock}
              title="ยังไม่มีข้อมูลเข้างานวันนี้"
            />
          ) : (
            <>
              <CeoAttendanceDonut
                data={data.attendanceDonut}
                presentRate={data.presentRate}
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Today: {data.presentToday} in · {data.lateToday} late ·{" "}
                {data.absentToday} absent
              </p>
              <div className="mt-1 border-t border-border/60 pt-1.5">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  7-day trend
                </p>
                <CeoWeekTrend data={data.weekTrend} />
              </div>
            </>
          )}
        </WidgetCard>

        <WidgetCard compact title="Pending Leave Approvals">
          {data.pendingLeaveRows.length === 0 ? (
            <DevelopmentEmptyState
              compact
              icon={CalendarCheck}
              title="ไม่มีคำขอลารออนุมัติ"
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {data.pendingLeaveRows.slice(0, 4).map((row) => (
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
                  <StatusPill label="Pending" variant="pending" />
                </li>
              ))}
            </ul>
          )}
        </WidgetCard>

        <WidgetCard compact title="Approval Queue">
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
              <span className="flex items-center gap-2 text-xs">
                <Clock className="size-5 text-brand-red" strokeWidth={1.6} />
                Daily attendance
              </span>
              <span className="text-xs font-semibold tabular-nums text-brand-red">
                {data.pendingAttendance} pending
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
              <span className="flex items-center gap-2 text-xs">
                <CalendarDays className="size-5 text-brand-red" strokeWidth={1.6} />
                Leave requests
              </span>
              <span className="text-xs font-semibold tabular-nums text-brand-red">
                {data.pendingLeaves} pending
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/80 bg-muted/20 p-2.5 text-xs text-muted-foreground">
              <Timer className="size-6 text-muted-foreground" strokeWidth={1.6} />
              OT requests — ดูสรุปบน Dashboard
            </div>
          </div>
        </WidgetCard>
      </div>

      <div className="grid shrink-0 gap-2 md:gap-2.5 lg:grid-cols-3 xl:grid-cols-4">
        <WidgetCard compact title="Department Attendance">
          {data.departmentRows.length === 0 ? (
            <DevelopmentEmptyState
              compact
              icon={Building2}
              title="ยังไม่มีข้อมูลแผนก"
            />
          ) : (
            <div className="space-y-2">
              {data.departmentRows.slice(0, 5).map((row) => (
                <div key={row.name}>
                  <div className="mb-0.5 flex justify-between text-[10px]">
                    <span className="truncate font-medium">{row.name}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {row.present}/{row.headcount} · {row.rate}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
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
                </div>
              ))}
            </div>
          )}
        </WidgetCard>

        <WidgetCard compact title="Recent Activity">
          {data.recentActivity.length === 0 ? (
            <DevelopmentEmptyState
              compact
              icon={Users}
              title="ยังไม่มีกิจกรรมล่าสุด"
            />
          ) : (
            <ul className="space-y-2">
              {data.recentActivity.map((item, i) => {
                const meta = ACTIVITY_ICONS[item.kind] ?? {
                  icon: Users,
                  className: "text-muted-foreground bg-muted",
                }
                const Icon = meta.icon
                return (
                  <li key={i} className="flex gap-2 text-[11px]">
                    <span
                      className={cn(
                        "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md",
                        meta.className
                      )}
                    >
                      <Icon className="size-3.5" strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                      <p className="leading-snug">{item.text}</p>
                      <p className="text-[10px] text-muted-foreground">{item.time}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </WidgetCard>

        <WidgetCard compact title="Branch Announcements" href="/admin/announcements">
          {data.announcements.length === 0 ? (
            <DevelopmentEmptyState
              compact
              icon={Megaphone}
              title="ยังไม่มีประกาศ"
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {data.announcements.map((a, i) => (
                <li key={i} className="py-1.5">
                  <div className="flex items-start gap-1.5">
                    <Megaphone className="mt-0.5 size-4 shrink-0 text-brand-red" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{a.title}</p>
                      <p className="text-[10px] text-muted-foreground">{a.date}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </WidgetCard>

        {QUICK_ACTIONS.length > 0 ? (
          <WidgetCard compact title="Quick Actions">
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex flex-col items-center gap-1 rounded-lg border border-border/80 bg-muted/20 px-1 py-2 text-center transition-colors hover:border-brand-red/40 hover:bg-brand-red/5"
                >
                  <action.icon className="size-7 text-brand-red" strokeWidth={1.6} />
                  <span className="text-[9px] font-medium leading-tight">
                    {action.label}
                  </span>
                </Link>
              ))}
            </div>
          </WidgetCard>
        ) : null}
      </div>
    </div>
  )
}
