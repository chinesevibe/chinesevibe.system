"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { AlertTriangle, Briefcase, Clock3, LogIn, Plane } from "lucide-react"

import { KpiCard } from "@/components/brand/KpiCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DailyRoster } from "@/lib/attendance/daily-roster"
import {
  TIME_KANBAN_BUCKETS,
  resolveTimeKanbanBucketId,
} from "@/lib/attendance/time-kanban"
import { appendReturnTo } from "@/lib/navigation/return-to"
import { cn } from "@/lib/utils"

type RosterEmployee = DailyRoster["groups"][number]["employees"][number]
type RosterListItem = {
  employee: RosterEmployee
  groupName: string
}

function sortByCode(left: RosterEmployee, right: RosterEmployee): number {
  const codeCompare = left.employeeCode.localeCompare(right.employeeCode, "en")
  if (codeCompare !== 0) return codeCompare
  return left.name.localeCompare(right.name, "th")
}

function buildRosterItems(
  groups: DailyRoster["groups"],
  predicate: (employee: RosterEmployee) => boolean
): RosterListItem[] {
  return groups.flatMap((group) =>
    group.employees
      .filter(predicate)
      .sort(sortByCode)
      .map((employee) => ({
        employee,
        groupName: group.name,
      }))
  )
}

function isWorkingEmployee(employee: RosterEmployee): boolean {
  return (employee.status === "present" || employee.status === "late") && !!employee.checkedInAt
}

/** Get ICT date string (YYYY-MM-DD) from an ISO timestamp */
function ictDateOf(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 7 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 10)
}

/**
 * For the Kanban: hide employees who already checked out from a previous-day shift.
 * Overnight workers who are still on shift (no checkout yet) are always shown.
 */
function isKanbanVisible(employee: RosterEmployee, rosterDate: string): boolean {
  if (!employee.checkedOutAt) return true                     // still working → show
  if (!employee.checkedInAt) return false
  return ictDateOf(employee.checkedInAt) >= rosterDate        // checked in today → show
}

function PendingEmployeeCard({
  employee,
  index,
  returnTo,
}: {
  employee: RosterEmployee
  index: number
  returnTo?: string | null
}) {
  return (
    <Link
      href={appendReturnTo(employee.employeeHref, returnTo)}
      className="grid grid-cols-[1.7rem_minmax(0,1fr)] items-start gap-2 rounded-xl border border-border/60 bg-background px-2.5 py-2 transition hover:border-brand-red/30 hover:bg-brand-red/5"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-red text-[10px] font-bold text-white">
        {index + 1}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold uppercase tracking-[0.06em] text-foreground">
          {employee.employeeCode}
        </span>
        <span className="block text-[11px] text-muted-foreground">{employee.workTimeText}</span>
      </span>
    </Link>
  )
}

function KanbanTicket({
  employee,
  index,
  returnTo,
}: {
  employee: RosterEmployee
  index: number
  returnTo?: string | null
}) {
  const toneClass = employee.checkedOutAt
    ? "border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/60"
    : employee.status === "late"
      ? "border-amber-200 bg-amber-50/70 hover:bg-amber-100/60"
      : "border-border/70 bg-background hover:border-brand-red/30 hover:bg-brand-red/5"

  return (
    <Link
      href={appendReturnTo(employee.employeeHref, returnTo)}
      className={cn(
        "flex min-h-14 flex-col items-start justify-between gap-1.5 rounded-xl border px-2.5 py-2 transition",
        toneClass
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-red text-[9px] font-bold text-white">
          {index + 1}
        </span>
        <span className="truncate text-xs font-semibold uppercase tracking-[0.06em] text-foreground">
          {employee.employeeCode}
        </span>
      </div>
      {employee.checkedOutAt ? (
        <span className="flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold text-red-600">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
          Check-Out
        </span>
      ) : employee.checkedInAt ? (
        <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
          <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-500" />
          Working
        </span>
      ) : null}
    </Link>
  )
}

function CompactSideList({
  title,
  items,
  emptyText,
  returnTo,
}: {
  title: string
  items: RosterListItem[]
  emptyText: string
  returnTo?: string | null
}) {
  return (
    <Card className="rounded-[1.5rem] border border-border/70 bg-gradient-to-br from-background to-muted/15 shadow-sm">
      <CardHeader className="border-b border-border/50 pb-4">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          items.map(({ employee, groupName }) => (
            <Link
              key={`${title}-${employee.id}`}
              href={appendReturnTo(employee.employeeHref, returnTo)}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background px-3 py-2 transition hover:border-brand-red/30 hover:bg-brand-red/5"
            >
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold uppercase tracking-[0.06em] text-foreground">
                  {employee.employeeCode}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {employee.statusLabel} • {groupName}
                </span>
              </span>
              <span className="text-[11px] text-muted-foreground">{employee.workTimeText}</span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export function AttendanceTodayRoster({
  roster,
  returnTo,
}: {
  roster: DailyRoster
  returnTo?: string | null
}) {
  const router = useRouter()
  const now = new Date()

  useEffect(() => {
    if (roster.date !== roster.today) return

    const refresh = () => router.refresh()
    const firstDelay = 60_000 - (Date.now() % 60_000)
    let intervalId: number | undefined
    const firstTimer = window.setTimeout(() => {
      refresh()
      intervalId = window.setInterval(refresh, 60_000)
    }, firstDelay)

    return () => {
      window.clearTimeout(firstTimer)
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [roster.date, roster.today, router])

  const workingEmployees = buildRosterItems(roster.groups, isWorkingEmployee)
  const leaveEmployees = buildRosterItems(roster.groups, (employee) => employee.status === "on_leave")
  const offEmployees = buildRosterItems(roster.groups, (employee) => employee.status === "off")
  const unassignedEmployees = buildRosterItems(roster.groups, (employee) => employee.status === "unassigned")

  const notCheckedInEmployees = buildRosterItems(
    roster.groups,
    (employee) =>
      !employee.checkedInAt &&
      (employee.status === "pending" || employee.status === "upcoming" || employee.status === "absent")
  ).sort((left, right) => {
    const timeCompare = left.employee.workTimeText.localeCompare(right.employee.workTimeText, "en")
    if (timeCompare !== 0) return timeCompare
    return sortByCode(left.employee, right.employee)
  })

  const bucketedEmployees = TIME_KANBAN_BUCKETS.map((bucket) => ({
    ...bucket,
    employees: workingEmployees
      .filter(
        ({ employee }) =>
          isKanbanVisible(employee, roster.date) &&
          resolveTimeKanbanBucketId({
            checkedInAt: employee.checkedInAt,
            checkedOutAt: employee.checkedOutAt,
            workTimeText: employee.workTimeText,
            rosterDate: roster.date,
            today: roster.today,
            now,
          }) === bucket.id
      )
      .map(({ employee }) => employee)
      .sort(sortByCode),
  }))

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="เช็คอินแล้ว" value={roster.totals.checkedIn} icon={LogIn} accent="success" />
        <KpiCard label="มาสาย" value={roster.totals.late} icon={AlertTriangle} accent="warning" />
        <KpiCard label="ลา" value={roster.totals.onLeave} icon={Plane} accent="info" />
        <KpiCard label="ขาด" value={roster.totals.absent} icon={Briefcase} />
      </div>

      {notCheckedInEmployees.length > 0 ? (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {notCheckedInEmployees.map(({ employee }, index) => (
            <PendingEmployeeCard
              key={`pending-${employee.id}`}
              employee={employee}
              index={index}
              returnTo={returnTo}
            />
          ))}
        </div>
      ) : null}

      <Card className="rounded-[1.75rem] border border-border/70 bg-gradient-to-br from-background via-background to-muted/15 shadow-sm">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-xl">Kanban ตามช่วงเวลา</CardTitle>
              <p className="text-sm text-muted-foreground">
                card แสดงแค่รหัสพนักงาน และระบบจะย้าย card ข้ามคอลัมน์ตามเวลาจริงอัตโนมัติทุก 1 นาที
              </p>
            </div>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700">
              4 คอลัมน์คงที่
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 xl:grid-cols-4">
            {bucketedEmployees.map((bucket) => (
              <section
                key={bucket.id}
                className="rounded-[1.4rem] border border-border/70 bg-muted/15 p-3"
              >
                <div className="mb-3 rounded-[1rem] border border-border/70 bg-background px-3 py-3">
                  <p className="text-lg font-semibold text-foreground">{bucket.label}</p>
                  <p className="text-xs text-muted-foreground">{bucket.description}</p>
                  <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {bucket.employees.length} records
                  </p>
                  {bucket.employees.length > 0 && (
                    <div className="mt-1.5 flex gap-2">
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Working {bucket.employees.filter((e) => e.checkedInAt && !e.checkedOutAt).length}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-red-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        Check-Out {bucket.employees.filter((e) => !!e.checkedOutAt).length}
                      </span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {bucket.employees.length === 0 ? (
                    <div className="col-span-3 rounded-xl border border-dashed border-border/80 bg-background/70 px-3 py-4 text-center text-xs text-muted-foreground">
                      ไม่มีรายการในช่วงนี้
                    </div>
                  ) : (
                    bucket.employees.map((employee, index) => (
                      <KanbanTicket
                        key={`${bucket.id}-${employee.id}`}
                        employee={employee}
                        index={index}
                        returnTo={returnTo}
                      />
                    ))
                  )}
                </div>
              </section>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <CompactSideList
          title="ลางาน"
          items={leaveEmployees}
          emptyText="ไม่มีพนักงานลางาน"
          returnTo={returnTo}
        />
        <CompactSideList
          title="วันหยุดประจำสัปดาห์"
          items={offEmployees}
          emptyText="ไม่มีพนักงานที่เป็นวันหยุด"
          returnTo={returnTo}
        />
        <CompactSideList
          title="ยังไม่กำหนดเวลา"
          items={unassignedEmployees}
          emptyText="ทุกคนมีเวลาเข้า-ออกงานแล้ว"
          returnTo={returnTo}
        />
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock3 className="size-3.5" />
        <span>วันที่ดูรายงาน: {roster.date}</span>
        {roster.goLiveDate ? <span>• go-live: {roster.goLiveDate}</span> : null}
      </div>
    </div>
  )
}
