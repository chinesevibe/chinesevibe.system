import { Clock, CalendarDays, AlertTriangle } from "lucide-react"

import { KpiCard } from "@/components/brand/KpiCard"
import type { AttendanceSummary } from "@/features/attendance/types"
import { cn } from "@/lib/utils"

export function AttendanceSummaryCard({
  summary,
  compact = false,
}: {
  summary: AttendanceSummary
  compact?: boolean
}) {
  return (
    <div className={cn("grid gap-3", compact ? "grid-cols-3" : "gap-4 sm:grid-cols-3")}>
      <KpiCard
        compact={compact}
        label={compact ? "วันทำงาน" : "วันทำงาน (ในช่วงที่เลือก)"}
        value={summary.workDays}
        icon={CalendarDays}
      />
      <KpiCard
        compact={compact}
        label="ชั่วโมงรวม"
        value={summary.totalHours.toFixed(1)}
        icon={Clock}
        accent="success"
      />
      <KpiCard
        compact={compact}
        label="มาสาย"
        value={summary.lateCount}
        icon={AlertTriangle}
        accent="warning"
      />
    </div>
  )
}
