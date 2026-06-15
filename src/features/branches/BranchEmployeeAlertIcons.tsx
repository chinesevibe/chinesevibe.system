import {
  AlertTriangle,
  CalendarDays,
  Clock,
  Timer,
  UserPlus,
} from "lucide-react"

import type { BranchEmployeeAlerts } from "@/features/branches/branch-hub-data"
import { cn } from "@/lib/utils"

function AlertChip({
  icon: Icon,
  count,
  label,
  className,
}: {
  icon: typeof Clock
  count?: number
  label: string
  className?: string
}) {
  return (
    <span
      title={label}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
        className
      )}
    >
      <Icon className="size-3" strokeWidth={2} />
      {count !== undefined && count > 0 ? count : null}
    </span>
  )
}

export function BranchEmployeeAlertIcons({
  alerts,
  inline = false,
}: {
  alerts: BranchEmployeeAlerts
  /** แสดงต่อท้ายชื่อพนักงาน */
  inline?: boolean
}) {
  const hasAny =
    alerts.pendingLeave > 0 ||
    alerts.pendingAttendance > 0 ||
    alerts.pendingOvertime > 0 ||
    alerts.pendingApproval ||
    alerts.complianceDue

  if (!hasAny) {
    return inline ? null : <span className="text-[10px] text-muted-foreground">—</span>
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1",
        inline ? "shrink-0" : "justify-end"
      )}
    >
      {alerts.pendingApproval ? (
        <AlertChip
          icon={UserPlus}
          label="รออนุมัติลงทะเบียน"
          className="bg-amber-100 text-amber-900"
        />
      ) : null}
      {alerts.pendingLeave > 0 ? (
        <AlertChip
          icon={CalendarDays}
          count={alerts.pendingLeave}
          label="ลารออนุมัติ"
          className="bg-sky-100 text-sky-800"
        />
      ) : null}
      {alerts.pendingAttendance > 0 ? (
        <AlertChip
          icon={Clock}
          count={alerts.pendingAttendance}
          label="เวลางานรออนุมัติ"
          className="bg-amber-100 text-amber-900"
        />
      ) : null}
      {alerts.pendingOvertime > 0 ? (
        <AlertChip
          icon={Timer}
          count={alerts.pendingOvertime}
          label="OT รออนุมัติ"
          className="bg-violet-100 text-violet-800"
        />
      ) : null}
      {alerts.complianceDue ? (
        <AlertChip
          icon={AlertTriangle}
          label="ทดลองงาน/วีซ่า/Work Permit ใกล้ครบ"
          className="bg-rose-100 text-rose-800"
        />
      ) : null}
    </div>
  )
}
