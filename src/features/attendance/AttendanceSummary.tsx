import { Clock, CalendarDays, AlertTriangle } from "lucide-react"

import { KpiCard } from "@/components/brand/KpiCard"
import type { AttendanceSummary } from "@/features/attendance/types"

export function AttendanceSummaryCard({ summary }: { summary: AttendanceSummary }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <KpiCard
        label="วันทำงาน (ในช่วงที่เลือก)"
        value={summary.workDays}
        icon={CalendarDays}
      />
      <KpiCard
        label="ชั่วโมงรวม"
        value={summary.totalHours.toFixed(1)}
        icon={Clock}
        accent="success"
      />
      <KpiCard
        label="มาสาย"
        value={summary.lateCount}
        icon={AlertTriangle}
        accent="warning"
      />
    </div>
  )
}
