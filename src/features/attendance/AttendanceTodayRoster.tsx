import Link from "next/link"
import { AlertTriangle, Briefcase, Clock3, LogIn, LogOut, Plane } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KpiCard } from "@/components/brand/KpiCard"
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
        "block w-full rounded-xl border bg-background px-3 py-2.5 transition hover:border-brand-red/30 hover:bg-brand-red/5",
        isCompleted
          ? "border-red-200/80 bg-red-50/25 hover:bg-red-100/40"
          : "border-border/70"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {isCompleted ? <LogOut className="mr-2 inline-block size-4 shrink-0 text-red-600" /> : null}
            {employee.name}{" "}
            <span className="text-xs font-normal tabular-nums text-muted-foreground">
              ({employee.employeeCode})
            </span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
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
    <Card>
      <CardHeader>
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
        <p className="text-sm text-muted-foreground">
          พนักงานที่ยังไม่เช็คอินแต่ยังอยู่ในช่วง grace: {roster.totals.pending} คน
        </p>
      ) : null}

      <div className="grid gap-4">
        {roster.groups.map((group, index) => (
          <Card key={group.id} className="overflow-hidden">
            <details open={group.id === roster.nextShiftId || index === 0} className="group">
              <summary className="cursor-pointer list-none px-4 py-4">
                <CardHeader className="px-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle>{group.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {group.timeRange} • {group.stateLabel}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {group.id === roster.nextShiftId ? (
                        <Badge variant="outline">กำลังกะถัดไป</Badge>
                      ) : null}
                      <span>
                        กำลังทำงาน{" "}
                        {
                          group.employees.filter(
                            (employee) =>
                              isWorkingStatus(employee.status) &&
                              employee.checkedInAt &&
                              !employee.checkedOutAt
                          ).length
                        }
                      </span>
                      <span>
                        <span className="inline-flex items-center gap-1 text-red-700">
                          <LogOut className="size-3" />
                          ออกแล้ว{" "}
                        </span>
                        {
                          group.employees.filter(
                            (employee) =>
                              isWorkingStatus(employee.status) && employee.checkedInAt && employee.checkedOutAt
                          ).length
                        }
                      </span>
                      <span>สาย {group.totals.late}</span>
                      <span>ลา {group.totals.onLeave}</span>
                      <span>ขาด {group.totals.absent}</span>
                    </div>
                  </div>
                </CardHeader>
              </summary>
              <CardContent className="border-t bg-muted/10 py-4">
                {(() => {
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
                    <div className="space-y-4">
                      {activeEmployees.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {completedEmployees.length > 0
                            ? "ทุกคนในรอบนี้ออกงานครบแล้ว"
                            : "ยังไม่มีคนอยู่ในรอบนี้"}
                        </p>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                          {activeEmployees.map((employee) => (
                            <EmployeeRosterCard
                              key={employee.id}
                              employee={employee}
                              returnTo={returnTo}
                            />
                          ))}
                        </div>
                      )}

                      {completedEmployees.length > 0 ? (
                        <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">ออกงานแล้ว</p>
                            <span className="text-xs text-muted-foreground">
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
                  )
                })()}
              </CardContent>
            </details>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">รายการอื่นๆ</CardTitle>
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

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock3 className="size-3.5" />
        <span>วันที่ดูรายงาน: {roster.date}</span>
        {roster.goLiveDate ? <span>• go-live: {roster.goLiveDate}</span> : null}
      </div>
    </div>
  )
}
