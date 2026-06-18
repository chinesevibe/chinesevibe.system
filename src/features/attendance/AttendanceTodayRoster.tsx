import Link from "next/link"
import { AlertTriangle, Briefcase, Clock3, LogIn, Plane } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KpiCard } from "@/components/brand/KpiCard"
import type { DailyRoster, DailyRosterEmployeeStatus } from "@/lib/attendance/daily-roster"
import { cn } from "@/lib/utils"

function badgeVariant(status: DailyRosterEmployeeStatus) {
  if (status === "late" || status === "absent") return "destructive" as const
  if (status === "on_leave") return "secondary" as const
  return "outline" as const
}

function isWorkingStatus(status: DailyRosterEmployeeStatus): boolean {
  return status === "present" || status === "late"
}

function EmployeeRosterCard({
  employee,
}: {
  employee: DailyRoster["groups"][number]["employees"][number]
}) {
  return (
    <Link
      key={employee.id}
      href={employee.employeeHref}
      className="rounded-xl border border-border/70 bg-background px-3 py-2.5 transition hover:border-brand-red/30 hover:bg-brand-red/5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {employee.name}{" "}
            <span className="text-xs font-normal tabular-nums text-muted-foreground">
              ({employee.employeeCode})
            </span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {[employee.position, employee.branchName].filter(Boolean).join(" • ") || "—"}
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

export function AttendanceTodayRoster({ roster }: { roster: DailyRoster }) {
  const leaveEmployees = roster.groups.flatMap((group) =>
    group.employees.filter((employee) => employee.status === "on_leave")
  )
  const absentEmployees = roster.groups.flatMap((group) =>
    group.employees.filter((employee) => employee.status === "absent")
  )
  const otherEmployees = roster.groups.flatMap((group) =>
    group.employees.filter(
      (employee) =>
        employee.status === "off" ||
        employee.status === "pending" ||
        employee.status === "upcoming" ||
        employee.status === "unassigned"
    )
  )

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
                      <span>เช็คอิน {group.totals.checkedIn}/{group.totals.total}</span>
                      <span>สาย {group.totals.late}</span>
                      <span>ลา {group.totals.onLeave}</span>
                      <span>ขาด {group.totals.absent}</span>
                    </div>
                  </div>
                </CardHeader>
              </summary>
              <CardContent className="border-t bg-muted/10 py-4">
                {group.employees.filter((employee) => isWorkingStatus(employee.status)).length === 0 ? (
                  <p className="text-sm text-muted-foreground">ยังไม่มีคนอยู่ในรอบนี้</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {group.employees
                      .filter((employee) => isWorkingStatus(employee.status))
                      .map((employee) => (
                        <EmployeeRosterCard key={employee.id} employee={employee} />
                      ))}
                  </div>
                )}
              </CardContent>
            </details>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ลางาน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {leaveEmployees.length === 0 ? (
              <p className="text-sm text-muted-foreground">ไม่มีพนักงานลางาน</p>
            ) : (
              leaveEmployees.map((employee) => (
                <EmployeeRosterCard key={employee.id} employee={employee} />
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ขาดงาน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {absentEmployees.length === 0 ? (
              <p className="text-sm text-muted-foreground">ไม่มีพนักงานขาดงาน</p>
            ) : (
              absentEmployees.map((employee) => (
                <EmployeeRosterCard key={employee.id} employee={employee} />
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">รายการอื่นๆ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {otherEmployees.length === 0 ? (
              <p className="text-sm text-muted-foreground">ไม่มีรายการอื่น</p>
            ) : (
              otherEmployees.map((employee) => (
                <EmployeeRosterCard key={employee.id} employee={employee} />
              ))
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
