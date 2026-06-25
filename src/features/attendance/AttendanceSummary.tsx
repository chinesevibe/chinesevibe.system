import { Wallet, Clock, CalendarDays, AlertTriangle, LogOut, MapPinned, ShieldAlert } from "lucide-react"

import { KpiCard } from "@/components/brand/KpiCard"
import type { AttendanceSummary } from "@/features/attendance/types"
import { cn } from "@/lib/utils"

function formatHours(hours: number): string {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1)
}

export function AttendanceSummaryCard({
  summary,
  pendingReviewCount = 0,
  flaggedCount = 0,
  compact = false,
  strip = false,
}: {
  summary: AttendanceSummary
  pendingReviewCount?: number
  flaggedCount?: number
  compact?: boolean
  /** Micro-height horizontal strip — fits 7 KPIs in one row on desktop */
  strip?: boolean
}) {
  // ── Strip layout (micro cards, no decorative wrappers) ──
  if (strip) {
    const hasSalary = summary.estimatedEarnings != null
    return (
      <div
        className={cn(
          "grid gap-2",
          hasSalary
            ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-7"
            : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
        )}
      >
        <KpiCard micro label="วันทำงาน" value={summary.workDays} icon={CalendarDays} />
        <KpiCard micro label="ชั่วโมงรวม" value={formatHours(summary.totalHours)} icon={Clock} accent="success" />
        <KpiCard micro label="มาสาย" value={summary.lateCount} icon={AlertTriangle} accent="warning" />
        <KpiCard micro label="ยังไม่เช็คออก" value={summary.inProgressCount} icon={LogOut} accent="info" />
        <KpiCard micro label="รอตรวจพิกัด" value={pendingReviewCount} icon={MapPinned} accent="warning" />
        <KpiCard micro label="ต้องจับตา" value={flaggedCount} icon={ShieldAlert} accent="purple" />
        {hasSalary ? (
          <KpiCard micro label="ยอดประมาณ" value={summary.estimatedEarnings!} icon={Wallet} accent="purple" />
        ) : null}
      </div>
    )
  }

  // ── Full / compact layout ──
  return (
    <div
      className={cn(
        "grid gap-3",
        compact ? "grid-cols-2 md:grid-cols-4" : "gap-4 sm:grid-cols-2 xl:grid-cols-6"
      )}
    >
      <div className={cn(!compact && "rounded-[1.5rem] border border-border/70 bg-gradient-to-br from-background to-muted/15 p-1 shadow-sm", compact && "contents")}>
        <KpiCard
          compact={compact}
          label={compact ? "วันทำงาน" : "วันทำงาน (ในช่วงที่เลือก)"}
          value={summary.workDays}
          icon={CalendarDays}
          detail={compact ? undefined : "จำนวนรายการในช่วงวันที่ที่เลือก"}
        />
      </div>
      <div className={cn(!compact && "rounded-[1.5rem] border border-emerald-200/70 bg-gradient-to-br from-emerald-50/70 to-background p-1 shadow-sm", compact && "contents")}>
        <KpiCard
          compact={compact}
          label="ชั่วโมงรวม"
          value={formatHours(summary.totalHours)}
          icon={Clock}
          accent="success"
          detail={compact ? undefined : "รวมจากชั่วโมงจริงหลังคำนวณตามกะ"}
        />
      </div>
      <div className={cn(!compact && "rounded-[1.5rem] border border-amber-200/70 bg-gradient-to-br from-amber-50/80 to-background p-1 shadow-sm", compact && "contents")}>
        <KpiCard
          compact={compact}
          label="มาสาย"
          value={summary.lateCount}
          icon={AlertTriangle}
          accent="warning"
          detail={compact ? undefined : "รายการที่เกินเวลาเริ่มงานตามกติกาใหม่"}
        />
      </div>
      <div className={cn(!compact && "rounded-[1.5rem] border border-sky-200/70 bg-gradient-to-br from-sky-50/80 to-background p-1 shadow-sm", compact && "contents")}>
        <KpiCard
          compact={compact}
          label="ยังไม่เช็คออก"
          value={summary.inProgressCount}
          icon={LogOut}
          accent="info"
          detail={compact ? undefined : "รอบงานที่ยังไม่มีเวลาออก"}
        />
      </div>
      <div className={cn(!compact && "rounded-[1.5rem] border border-rose-200/70 bg-gradient-to-br from-rose-50/80 to-background p-1 shadow-sm", compact && "contents")}>
        <KpiCard
          compact={compact}
          label="รอ HR ตรวจพิกัด"
          value={pendingReviewCount}
          icon={MapPinned}
          accent="warning"
          detail={compact ? undefined : "รายการพิกัดผิดปกติในผลลัพธ์ที่กำลังแสดง"}
        />
      </div>
      <div className={cn(!compact && "rounded-[1.5rem] border border-violet-200/70 bg-gradient-to-br from-violet-50/80 to-background p-1 shadow-sm", compact && "contents")}>
        <KpiCard
          compact={compact}
          label="รายการต้องจับตา"
          value={flaggedCount}
          icon={ShieldAlert}
          accent="purple"
          detail={compact ? undefined : "มาสาย ยังไม่เช็คออก หรือมีปัญหาพิกัดในผลลัพธ์ที่กำลังแสดง"}
        />
      </div>
      {summary.estimatedEarnings != null ? (
        <div
          className={cn(
            !compact &&
              "rounded-[1.5rem] border border-violet-200/70 bg-gradient-to-br from-violet-50/80 to-background p-1 shadow-sm",
            compact && "contents"
          )}
        >
          <KpiCard
            compact={compact}
            label="ยอดเงินโดยประมาณ"
            value={summary.estimatedEarnings}
            icon={Wallet}
            accent="purple"
            detail={compact ? undefined : "คำนวณจากชั่วโมงทำงาน + อัตราค่าจ้างของพนักงาน"}
          />
        </div>
      ) : null}
    </div>
  )
}
