import { AlertTriangle } from "lucide-react"

import { AttendanceSummaryCard } from "@/features/attendance/AttendanceSummary"
import type { AttendanceSummary } from "@/features/attendance/types"

type EmployeeAttendanceAnomalySummaryProps = {
  attendanceSummary: AttendanceSummary
}

export function EmployeeAttendanceAnomalySummary({
  attendanceSummary,
}: EmployeeAttendanceAnomalySummaryProps) {
  return (
    <section className="rounded-xl border border-border/70 bg-muted/20 p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>สรุปและจุดที่ต้องตรวจ</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        ใช้ส่วนนี้เพื่อตรวจว่าต้องแก้ไขบันทึกเวลา, ตรวจพิกัด, หรือไล่ย้อนประวัติในตารางด้านล่าง
      </p>
      <div className="mt-4">
        <AttendanceSummaryCard summary={attendanceSummary} compact />
      </div>
    </section>
  )
}
