import Link from "next/link"
import { AlertTriangle, Briefcase, Clock3, LogIn, LogOut, Plane } from "lucide-react"

import { KpiCard } from "@/components/brand/KpiCard"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DailyRoster, DailyRosterEmployeeStatus } from "@/lib/attendance/daily-roster"
import { appendReturnTo } from "@/lib/navigation/return-to"
import { cn } from "@/lib/utils"

function badgeVariant(status: DailyRosterEmployeeStatus) {
  if (status === "late" || status === "absent") return "destructive" as const
  if (status === "on_leave") return "secondary" as const
  return "outline" as const
}

function isWorkingStatus(status: DailyRosterEmployeeStatus): boolean {
  return status === "present" || status === "late"
}

type RosterEmployee = DailyRoster["groups"][number]["employees"][number]
type RosterGroup = DailyRoster["groups"][number]
type RosterListItem = {
  employee: RosterEmployee
  contextLabel?: string
}

function compareRosterItems(left: RosterListItem, right: RosterListItem): number {
  const contextCompare = (left.contextLabel ?? "").localeCompare(right.contextLabel ?? "", "th")
  if (contextCompare !== 0) return contextCompare
  return left.employee.name.localeCompare(right.employee.name, "th")
}

function buildContextLabel(group: RosterGroup): string | undefined {
  if (group.id === "__unassigned__") return "ไม่มีกะ"
  return `${group.name} • ${group.timeRange}`
}

function buildRosterItems(
  groups: DailyRoster["groups"],
  predicate: (employee: RosterEmployee) => boolean
): RosterListItem[] {
  return groups
    .flatMap((group) =>
      group.employees
        .filter(predicate)
        .map((employee) => ({
          employee,
          contextLabel: buildContextLabel(group),
        }))
    )
    .sort(compareRosterItems)
}

function EmployeeRosterCard({
  employee,
  contextLabel,
  returnTo,
}: {
  employee: RosterEmployee
  contextLabel?: string
  returnTo?: string | null
}) {
  const isCompleted = Boolean(employee.checkedInAt && employee.checkedOutAt)

  return (
    <Link
      key={employee.id}
      href={appendReturnTo(employee.employeeHref, returnTo)}
      className={cn(
        "block w-full rounded-[1.1rem] border bg-background px-3 py-3 transition hover:border-brand-red/30 hover:bg-brand-red/5",
        isCompleted
          ? "border-red-200/80 bg-red-50/30 hover:bg-red-100/40"
          : "border-border/70"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">
            {isCompleted ? <LogOut className="mr-2 inline-block size-4 shrink-0 text-red-600" /> : null}
            {employee.name}{" "}
            <span className="text-xs font-normal tabular-nums text-muted-foreground">
              ({employee.employeeCode})
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {[employee.position, employee.branchName, contextLabel].filter(Boolean).join(" • ") || "—"}
          </p>
        </div>
        <Badge
          variant={badgeVariant(employee.status)}
          className={cn(
            employee.status === "present" && "border-emerald-200 text-emerald-700",
            employee.status === "off" && "border-slate-200 text-slate-700",
            employee.status === "pending" && "border-amber-200 text-amber-700",
            employee.status === "upcoming" && "border-sky-200 text-sky-700"
          )}
        >
          {employee.statusLabel}
        </Badge>
      </div>
      <p className="mt-2 text-sm tabular-nums text-muted-foreground">
        เข้า-ออก {employee.workTimeText}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{employee.note}</p>
    </Link>
  )
}

function RosterSection({
  title,
  emptyText,
  items,
  returnTo,
}: {
  title: string
  emptyText: string
  items: RosterListItem[]
  returnTo?: string | null
}) {
  return (
    <Card className="rounded-[1.5rem] border border-border/70 bg-gradient-to-br from-background to-muted/15 shadow-sm">
      <CardHeader className="border-b border-border/50">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          items.map(({ employee, contextLabel }) => (
            <EmployeeRosterCard
              key={`${employee.id}-${contextLabel ?? "none"}`}
              employee={employee}
              contextLabel={contextLabel}
              returnTo={returnTo}
            />
          ))
        )}
      </CardContent>
    </Card>
  )
}

function GroupStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string
  value: number
  tone?: "neutral" | "success" | "warning" | "danger"
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-800",
        tone === "danger" && "border-red-200 bg-red-50 text-red-800",
        tone === "neutral" && "border-slate-200 bg-slate-50 text-slate-700"
      )}
    >
      {label} {value}
    </span>
  )
}

export function AttendanceTodayRoster({
  roster,
  returnTo,
}: {
  roster: DailyRoster
  returnTo?: string | null
}) {
  const leaveEmployees = buildRosterItems(
    roster.groups,
    (employee) => employee.status === "on_leave"
  )
  const absentEmployees = buildRosterItems(
    roster.groups,
    (employee) => employee.status === "absent"
  )
  const pendingEmployees = buildRosterItems(
    roster.groups,
    (employee) => employee.status === "pending"
  )
  const upcomingEmployees = buildRosterItems(
    roster.groups,
    (employee) => employee.status === "upcoming"
  )
  const offEmployees = buildRosterItems(
    roster.groups,
    (employee) => employee.status === "off"
  )
  const unassignedEmployees = buildRosterItems(
    roster.groups,
    (employee) => employee.status === "unassigned"
  )
  const hasOtherEmployees =
    pendingEmployees.length > 0 ||
    upcomingEmployees.length > 0 ||
    offEmployees.length > 0 ||
    unassignedEmployees.length > 0

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="เช็คอินแล้ว" value={roster.totals.checkedIn} icon={LogIn} accent="success" />
        <KpiCard label="มาสาย" value={roster.totals.late} icon={AlertTriangle} accent="warning" />
        <KpiCard label="ลา" value={roster.totals.onLeave} icon={Plane} accent="info" />
        <KpiCard label="ขาด" value={roster.totals.absent} icon={Briefcase} />
      </div>

      {roster.totals.pending > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          พนักงานที่ยังไม่เช็คอินแต่ยังอยู่ในช่วง grace: {roster.totals.pending} คน
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.95fr)]">
        <div className="grid gap-4">
          {roster.groups.map((group, index) => {
            const activeEmployees = group.employees
              .filter(
                (employee) =>
                  isWorkingStatus(employee.status) &&
                  employee.checkedInAt &&
                  !employee.checkedOutAt
              )
              .sort((left, right) => left.name.localeCompare(right.name, "th"))
            const completedEmployees = group.employees
              .filter(
                (employee) =>
                  isWorkingStatus(employee.status) &&
                  employee.checkedInAt &&
                  employee.checkedOutAt
              )
              .sort((left, right) => left.name.localeCompare(right.name, "th"))

            return (
              <Card
                key={group.id}
                className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-gradient-to-br from-background via-background to-muted/15 shadow-sm"
              >
                <details open={group.id === roster.nextShiftId || index === 0} className="group">
                  <summary className="cursor-pointer list-none px-5 py-5">
                    <CardHeader className="px-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <CardTitle className="text-xl">{group.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {group.timeRange} • {group.stateLabel}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {group.id === roster.nextShiftId ? (
                            <Badge
                              variant="outline"
                              className="border-brand-red/20 bg-brand-red/5 text-brand-red"
                            >
                              กำลังกะถัดไป
                            </Badge>
                          ) : null}
                          <GroupStat label="กำลังทำงาน" value={activeEmployees.length} tone="success" />
                          <GroupStat label="ออกแล้ว" value={completedEmployees.length} tone="danger" />
                          <GroupStat label="สาย" value={group.totals.late} tone="warning" />
                          <GroupStat label="ลา" value={group.totals.onLeave} />
                          <GroupStat label="ขาด" value={group.totals.absent} />
                        </div>
                      </div>
                    </CardHeader>
                  </summary>
                  <CardContent className="border-t bg-muted/10 py-4">
                    <div className="space-y-4">
                      {activeEmployees.length === 0 ? (
                        <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-4 text-sm text-muted-foreground">
                          {completedEmployees.length > 0
                            ? "ทุกคนในรอบนี้ออกงานครบแล้ว"
                            : "ยังไม่มีคนอยู่ในรอบนี้"}
                        </div>
                      ) : (
                        <div className="rounded-[1.25rem] border border-emerald-200/70 bg-emerald-50/35 p-3">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-foreground">กำลังทำงาน</p>
                            <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-medium text-emerald-700">
                              {activeEmployees.length} คน
                            </span>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            {activeEmployees.map((employee) => (
                              <EmployeeRosterCard
                                key={employee.id}
                                employee={employee}
                                returnTo={returnTo}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {completedEmployees.length > 0 ? (
                        <div className="rounded-[1.25rem] border border-red-200/70 bg-red-50/35 p-3">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">ออกงานแล้ว</p>
                            <span className="rounded-full border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700">
                              {completedEmployees.length} คน
                            </span>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            {completedEmployees.map((employee) => (
                              <EmployeeRosterCard
                                key={employee.id}
                                employee={employee}
                                returnTo={returnTo}
                              />
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </details>
              </Card>
            )
          })}
        </div>

        <div className="grid content-start gap-4">
          <RosterSection
            title="ลางาน"
            emptyText="ไม่มีพนักงานลางาน"
            items={leaveEmployees}
            returnTo={returnTo}
          />
          <RosterSection
            title="ขาดงาน"
            emptyText="ไม่มีพนักงานขาดงาน"
            items={absentEmployees}
            returnTo={returnTo}
          />
          <Card className="rounded-[1.5rem] border border-border/70 bg-gradient-to-br from-background to-muted/15 shadow-sm">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-base">Incident panel / รายการอื่นๆ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!hasOtherEmployees ? (
                <p className="text-sm text-muted-foreground">ไม่มีรายการอื่น</p>
              ) : (
                <>
                  {pendingEmployees.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">รอเช็คอินในช่วง grace</p>
                      {pendingEmployees.map(({ employee, contextLabel }) => (
                        <EmployeeRosterCard
                          key={`${employee.id}-${contextLabel ?? "pending"}`}
                          employee={employee}
                          contextLabel={contextLabel}
                          returnTo={returnTo}
                        />
                      ))}
                    </div>
                  ) : null}
                  {upcomingEmployees.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">ยังไม่ถึงเวลาเริ่มกะ</p>
                      {upcomingEmployees.map(({ employee, contextLabel }) => (
                        <EmployeeRosterCard
                          key={`${employee.id}-${contextLabel ?? "upcoming"}`}
                          employee={employee}
                          contextLabel={contextLabel}
                          returnTo={returnTo}
                        />
                      ))}
                    </div>
                  ) : null}
                  {offEmployees.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">วันหยุดประจำสัปดาห์</p>
                      {offEmployees.map(({ employee, contextLabel }) => (
                        <EmployeeRosterCard
                          key={`${employee.id}-${contextLabel ?? "off"}`}
                          employee={employee}
                          contextLabel={contextLabel}
                          returnTo={returnTo}
                        />
                      ))}
                    </div>
                  ) : null}
                  {unassignedEmployees.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">ยังไม่กำหนดกะ</p>
                      {unassignedEmployees.map(({ employee, contextLabel }) => (
                        <EmployeeRosterCard
                          key={`${employee.id}-${contextLabel ?? "unassigned"}`}
                          employee={employee}
                          contextLabel={contextLabel}
                          returnTo={returnTo}
                        />
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock3 className="size-3.5" />
        <span>วันที่ดูรายงาน: {roster.date}</span>
        {roster.goLiveDate ? <span>• go-live: {roster.goLiveDate}</span> : null}
      </div>
    </div>
  )
}
