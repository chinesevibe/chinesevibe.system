import { Clock, CalendarDays, AlertTriangle, LogOut } from "lucide-react"

import { KpiCard } from "@/components/brand/KpiCard"
import type { AttendanceSummary } from "@/features/attendance/types"
import { cn } from "@/lib/utils"

function wholeHours(hours: number): string {
  return String(Math.floor(hours))
}

export function AttendanceSummaryCard({
  summary,
  compact = false,
}: {
  summary: AttendanceSummary
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        "grid gap-3",
        compact ? "grid-cols-2 md:grid-cols-4" : "gap-4 sm:grid-cols-2 xl:grid-cols-4"
      )}
    >
      <KpiCard
        compact={compact}
        label={compact ? "วันทำงาน" : "วันทำงาน (ในช่วงที่เลือก)"}
        value={summary.workDays}
        icon={CalendarDays}
        detail={compact ? undefined : "จำนวนรายการในช่วงวันที่ที่เลือก"}
      />
      <KpiCard
        compact={compact}
        label="ชั่วโมงรวม"
        value={wholeHours(summary.totalHours)}
        icon={Clock}
        accent="success"
        detail={compact ? undefined : "รวมจากชั่วโมงจริงหลังคำนวณตามกะ"}
      />
      <KpiCard
        compact={compact}
        label="มาสาย"
        value={summary.lateCount}
        icon={AlertTriangle}
        accent="warning"
        detail={compact ? undefined : "รายการที่เกินเวลาเริ่มงานตามกติกาใหม่"}
      />
      <KpiCard
        compact={compact}
        label="ยังไม่เช็คออก"
        value={summary.inProgressCount}
        icon={LogOut}
        accent="info"
        detail={compact ? undefined : "รอบงานที่ยังไม่มีเวลาออก"}
      />
    </div>
  )
}
