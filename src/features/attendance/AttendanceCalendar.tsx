"use client"

import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react"
import Link from "next/link"
import { useMemo } from "react"

import { buildCalendarGrid } from "@/features/attendance/calendar-grid"
import { useLocale } from "@/features/portal/LocaleProvider"
import type {
  AttendanceDayCell,
  AttendanceDayStatus,
} from "@/features/attendance/calendar-types"
import { liffHref } from "@/lib/i18n/liff-url"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]

type StatusStyle = {
  label: string
  dot: string
  cell: string
  badge: string
  accent: string
}

const STATUS: Record<AttendanceDayStatus, StatusStyle> = {
  complete: {
    label: "ครบ",
    dot: "bg-emerald-500",
    cell: "bg-emerald-50/80 border-emerald-100 hover:bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-800",
    accent: "border-l-emerald-500",
  },
  late: {
    label: "สาย",
    dot: "bg-amber-500",
    cell: "bg-amber-50/80 border-amber-100 hover:bg-amber-50",
    badge: "bg-amber-100 text-amber-900",
    accent: "border-l-amber-500",
  },
  in_progress: {
    label: "ทำงาน",
    dot: "bg-sky-500",
    cell: "bg-sky-50/80 border-sky-100 hover:bg-sky-50",
    badge: "bg-sky-100 text-sky-900",
    accent: "border-l-sky-500",
  },
  missing_checkout: {
    label: "ลืมออก",
    dot: "bg-orange-500",
    cell: "bg-orange-50/90 border-orange-200 hover:bg-orange-50",
    badge: "bg-orange-100 text-orange-900",
    accent: "border-l-orange-500",
  },
  missing_checkin: {
    label: "ลืมเข้า",
    dot: "bg-red-500",
    cell: "bg-red-50/90 border-red-200 hover:bg-red-50",
    badge: "bg-red-100 text-red-900",
    accent: "border-l-red-500",
  },
  on_leave: {
    label: "ลา",
    dot: "bg-violet-400",
    cell: "bg-violet-50/60 border-violet-100",
    badge: "bg-violet-100 text-violet-800",
    accent: "border-l-violet-400",
  },
  off: {
    label: "วันหยุด",
    dot: "bg-sky-400",
    cell: "bg-sky-50/70 border-sky-100",
    badge: "bg-sky-100 text-sky-800",
    accent: "border-l-sky-400",
  },
  no_shift: {
    label: "ไม่มีกะ",
    dot: "bg-muted-foreground/30",
    cell: "bg-muted/20 border-border/50",
    badge: "bg-muted text-muted-foreground",
    accent: "border-l-transparent",
  },
  future: {
    label: "",
    dot: "bg-transparent",
    cell: "bg-background border-border/40",
    badge: "",
    accent: "border-l-transparent",
  },
  retro_expired: {
    label: "หมดเวลา",
    dot: "bg-muted-foreground/40",
    cell: "bg-muted/30 border-border/60",
    badge: "bg-muted text-muted-foreground line-through",
    accent: "border-l-muted-foreground/30",
  },
}

const LEGEND_STATUSES: AttendanceDayStatus[] = [
  "complete",
  "late",
  "in_progress",
  "missing_checkin",
  "missing_checkout",
  "on_leave",
  "off",
  "retro_expired",
]

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

function buildMonthHref(basePath: string, month: string, extra?: Record<string, string>) {
  const params = new URLSearchParams({ month })
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (!value) continue
    params.set(key, value)
  }
  return `${basePath}?${params.toString()}`
}

function buildDayHref(basePath: string, day: AttendanceDayCell, extra?: Record<string, string>) {
  const params = new URLSearchParams({
    month: day.date.slice(0, 7),
    date: day.date,
    from: day.date,
    to: day.date,
    page: "1",
  })

  for (const [key, value] of Object.entries(extra ?? {})) {
    if (!value) continue
    params.set(key, value)
  }

  return `${basePath}?${params.toString()}`
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, 1))
  return date.toLocaleDateString("th-TH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
}

function ictToday(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function monthStats(days: AttendanceDayCell[]) {
  let complete = 0
  let issues = 0
  let leave = 0
  for (const day of days) {
    if (day.date > ictToday()) continue
    if (day.status === "on_leave") leave += 1
    else if (day.status === "off") continue
    else if (day.status === "complete" || day.status === "late") complete += 1
    else if (
      day.status === "missing_checkin" ||
      day.status === "missing_checkout" ||
      day.status === "retro_expired"
    ) {
      issues += 1
    }
  }
  return { complete, issues, leave }
}

function DayCellContent({
  day,
  status,
  isToday,
  compact = false,
}: {
  day: AttendanceDayCell | null
  status: AttendanceDayStatus
  isToday: boolean
  compact?: boolean
}) {
  const style = STATUS[status]
  const showBadge =
    day &&
    !day.checkIn &&
    status !== "future" &&
    status !== "on_leave" &&
    status !== "off" &&
    status !== "no_shift" &&
    style.label

  return (
    <>
      <div className="flex items-start justify-between gap-1">
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full font-semibold leading-none",
            compact ? "size-5 text-[10px]" : "size-6 text-xs",
            isToday
              ? "bg-brand-red text-white shadow-sm"
              : "text-foreground/90"
          )}
        >
          {day ? Number(day.date.slice(-2)) : ""}
        </span>
        {day && status !== "future" && status !== "no_shift" ? (
          <span
            className={cn("mt-1 size-2 shrink-0 rounded-full", style.dot)}
            aria-hidden
          />
        ) : null}
      </div>

      {day?.checkIn || day?.checkOut ? (
        <div className="mt-1.5 space-y-0.5 text-[10px] leading-tight text-foreground/75">
          {day.checkIn ? (
            <p className="flex items-center gap-0.5">
              <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                เข้า
              </span>
              <span className="font-medium tabular-nums text-foreground/90">
                {day.checkIn}
              </span>
            </p>
          ) : null}
          {day.checkOut ? (
            <p className="flex items-center gap-0.5">
              <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                ออก
              </span>
              <span className="font-medium tabular-nums text-foreground/90">
                {day.checkOut}
              </span>
            </p>
          ) : day.checkIn ? (
            <p className="text-[9px] text-orange-700/80">ยังไม่ออก</p>
          ) : null}
        </div>
      ) : showBadge ? (
        <span
          className={cn(
            "mt-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium",
            style.badge
          )}
        >
          {style.label}
        </span>
      ) : status === "on_leave" ? (
        <span
          className={cn(
            "mt-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium",
            style.badge
          )}
        >
          ลา
        </span>
      ) : status === "off" ? (
        <span
          className={cn(
            "mt-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium",
            style.badge
          )}
        >
          วันหยุด
        </span>
      ) : null}

      {day?.hours != null && day.checkOut ? (
        <p className="mt-1 text-[9px] tabular-nums text-muted-foreground">
          {day.hours.toFixed(1)} ชม.
        </p>
      ) : null}
    </>
  )
}

export function AttendanceCalendar({
  month,
  days,
  basePath,
  selectedDate,
  onDayClick,
  showLegend = true,
  compact = false,
  monthLinkQuery,
  dayLinkQuery,
  linkDays = false,
  hrMode = false,
}: {
  month: string
  days: AttendanceDayCell[]
  basePath: string
  selectedDate?: string | null
  onDayClick?: (cell: AttendanceDayCell) => void
  showLegend?: boolean
  /** Denser grid for side-by-side layouts */
  compact?: boolean
  monthLinkQuery?: Record<string, string>
  dayLinkQuery?: Record<string, string>
  linkDays?: boolean
  /** HR admin mode — makes all non-future days clickable for date override management */
  hrMode?: boolean
}) {
  const grid = buildCalendarGrid(month)
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days])
  const today = ictToday()
  const stats = useMemo(() => monthStats(days), [days])

  return (
    <div className={cn("flex flex-col", compact ? "gap-2.5" : "gap-4")}>
      {/* Header */}
      <div
        className={cn(
          "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
          compact && "gap-1.5"
        )}
      >
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex items-center justify-center rounded-lg bg-brand-red/10 text-brand-red",
              compact ? "size-8" : "size-9"
            )}
          >
            <CalendarDays className={compact ? "size-3.5" : "size-4"} strokeWidth={2} />
          </div>
          <div>
            <h3
              className={cn(
                "font-semibold leading-tight text-foreground",
                compact ? "text-sm" : "text-base"
              )}
            >
              {formatMonthLabel(month)}
            </h3>
            {!compact ? (
              <p className="text-xs text-muted-foreground">ปฏิทินเข้า-ออกงาน</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-1 self-start rounded-lg border border-border/80 bg-muted/30 p-0.5 sm:self-auto">
          <Link
            href={buildMonthHref(basePath, shiftMonth(month, -1), monthLinkQuery)}
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-background hover:text-foreground"
            aria-label="เดือนก่อน"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <Link
            href={buildMonthHref(basePath, ictToday().slice(0, 7), monthLinkQuery)}
            className="hidden min-w-[4.5rem] px-2 text-center text-xs font-medium text-foreground sm:block"
          >
            เดือนนี้
          </Link>
          <Link
            href={buildMonthHref(basePath, shiftMonth(month, 1), monthLinkQuery)}
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-background hover:text-foreground"
            aria-label="เดือนถัดไป"
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>

      {/* Month summary chips */}
      <div className="flex flex-wrap gap-1.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 font-medium text-emerald-800",
            compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
          )}
        >
          <span className="size-1.5 rounded-full bg-emerald-500" />
          ครบ {stats.complete}
        </span>
        {stats.issues > 0 ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 font-medium text-orange-900",
              compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
            )}
          >
            <span className="size-1.5 rounded-full bg-orange-500" />
            ตรวจ {stats.issues}
          </span>
        ) : null}
        {stats.leave > 0 ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 font-medium text-violet-800",
              compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
            )}
          >
            <span className="size-1.5 rounded-full bg-violet-400" />
            ลา {stats.leave}
          </span>
        ) : null}
      </div>

      {/* Legend */}
      {showLegend ? (
        <div
          className={cn(
            "flex flex-wrap gap-x-2 gap-y-1 rounded-lg bg-muted/25",
            compact ? "px-2 py-1.5" : "gap-x-3 gap-y-1.5 px-3 py-2"
          )}
        >
          {LEGEND_STATUSES.map((status) => (
            <span
              key={status}
              className={cn(
                "inline-flex items-center gap-1 text-muted-foreground",
                compact ? "text-[9px]" : "text-[11px]"
              )}
            >
              <span className={cn("size-2 rounded-full", STATUS[status].dot)} />
              {STATUS[status].label}
            </span>
          ))}
        </div>
      ) : null}

      {/* Weekday headers */}
      <div className={cn("grid grid-cols-7", compact ? "gap-1" : "gap-1.5")}>
        {WEEKDAYS.map((label, index) => (
          <div
            key={label}
            className={cn(
              "py-0.5 text-center font-semibold uppercase tracking-wide",
              compact ? "text-[9px]" : "text-[11px]",
              index === 0 || index === 6
                ? "text-muted-foreground/70"
                : "text-muted-foreground"
            )}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className={cn("grid grid-cols-7", compact ? "gap-1" : "gap-1.5")}>
        {grid.map((cell, i) => {
          const day = cell.date ? byDate.get(cell.date) : null
          const status = day?.status ?? (cell.date ? "future" : "future")
          const style = STATUS[status]
          const isToday = cell.date === today
          const clickable = Boolean(
            day && onDayClick && (day.retroEligible || hrMode)
          )
          const linkable = Boolean(day && linkDays && status !== "future")
          const isSelected = selectedDate === cell.date
          const colIndex = i % 7
          const isWeekend = colIndex === 0 || colIndex === 6
          const cellMinH = compact ? "min-h-[4.25rem]" : "min-h-[5.5rem]"

          if (!cell.day) {
            return <div key={i} className={cellMinH} aria-hidden />
          }

          const inner = (
            <DayCellContent
              day={day ?? null}
              status={status}
              isToday={isToday}
              compact={compact}
            />
          )

          const cellClass = cn(
            "rounded-lg border border-l-[3px] text-left transition",
            cellMinH,
            compact ? "p-1.5" : "p-2",
            style.cell,
            style.accent,
            isWeekend && status === "future" && "bg-muted/10",
            isToday && "ring-2 ring-brand-red/30 ring-offset-1",
            isSelected && "ring-2 ring-brand-red/60 ring-offset-1",
            (clickable || linkable) && "cursor-pointer hover:shadow-sm active:scale-[0.98]",
            !clickable && !linkable && onDayClick && "cursor-default"
          )

          if (linkable && day) {
            return (
              <Link
                key={i}
                href={buildDayHref(basePath, day, dayLinkQuery)}
                className={cellClass}
              >
                {inner}
              </Link>
            )
          }

          if (clickable && day) {
            return (
              <button
                key={i}
                type="button"
                onClick={() => onDayClick?.(day)}
                className={cellClass}
              >
                {inner}
              </button>
            )
          }

          return (
            <div key={i} className={cellClass}>
              {inner}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function AttendanceCorrectableBanner({
  items,
  liffBasePath = "/liff/attendance",
}: {
  items: Array<{
    workDate: string
    issue: "missing_checkin" | "missing_checkout"
    deadline: string
  }> 
  liffBasePath?: string
}) {
  const { locale } = useLocale()
  if (items.length === 0) return null

  return (
    <div className="overflow-hidden rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/50 shadow-sm">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          <AlertTriangle className="size-4" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-amber-950">ต้องลงเวลาย้อนหลัง</p>
          <p className="text-xs text-amber-800/80">แก้ได้ภายใน 48 ชม. หลังเลิกกะ</p>
        </div>
      </div>
      <ul className="divide-y divide-amber-200/60 border-t border-amber-200/60 bg-white/40">
        {items.map((item) => (
          <li key={item.workDate}>
            <Link
              href={liffHref(`${liffBasePath}?date=${item.workDate}`, locale)}
              className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition hover:bg-amber-50/80"
            >
              <span className="font-medium text-foreground">{item.workDate}</span>
              <span className="flex items-center gap-2 text-xs">
                <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900">
                  {item.issue === "missing_checkin" ? "ลืมเช็คเข้า" : "ลืมเช็คออก"}
                </span>
                <span className="inline-flex items-center gap-0.5 font-medium text-brand-red">
                  ลงย้อนหลัง
                  <ArrowRight className="size-3" />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function RetroQuotaBadge({
  used,
  limit,
}: {
  used: number
  limit: number
}) {
  const remaining = Math.max(0, limit - used)
  const ratio = limit > 0 ? used / limit : 0
  const barColor =
    ratio >= 1 ? "bg-red-500" : ratio >= 0.67 ? "bg-amber-500" : "bg-emerald-500"

  return (
    <div className="rounded-xl border border-border/80 bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="size-4 shrink-0" strokeWidth={1.75} />
          <span>สิทธิ์ลงย้อนหลังเดือนนี้</span>
        </div>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {used}/{limit} ครั้ง
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${Math.min(100, ratio * 100)}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        เหลือ {remaining} ครั้ง — หมดแล้วติดต่อ HR
      </p>
    </div>
  )
}
