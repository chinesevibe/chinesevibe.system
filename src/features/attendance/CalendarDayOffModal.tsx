"use client"

import { useState } from "react"
import { X, CalendarOff, CalendarCheck, Info } from "lucide-react"
import type { AttendanceDayCell } from "@/features/attendance/calendar-types"
import { cn } from "@/lib/utils"

function formatDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number)
  return new Intl.DateTimeFormat("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)))
}

export function CalendarDayOffModal({
  cell,
  employeeId,
  onClose,
  onMutated,
}: {
  cell: AttendanceDayCell
  employeeId: string
  onClose: () => void
  onMutated: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isOff = cell.status === "off"
  const isOverride = cell.isDateOverride
  const isWeeklyOff = isOff && !isOverride

  async function markDayOff() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/attendance/date-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, date: cell.date, type: "day_off" }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? "request_failed")
      }
      onMutated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
    } finally {
      setLoading(false)
    }
  }

  async function removeDayOff() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/attendance/date-override", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, date: cell.date }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? "request_failed")
      }
      onMutated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
    } finally {
      setLoading(false)
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative w-full max-w-sm rounded-2xl border border-border/80 bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-border/60">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              จัดการวันหยุด
            </p>
            <h2 className="mt-0.5 text-sm font-semibold text-foreground">
              {formatDate(cell.date)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-0.5 shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {/* Current status */}
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm",
              isOff
                ? "bg-sky-50 border border-sky-100 text-sky-800"
                : "bg-muted/40 border border-border/60 text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                isOff ? "bg-sky-400" : "bg-muted-foreground/40"
              )}
            />
            <span>
              {isOverride
                ? "วันหยุดพิเศษ (HR กำหนด)"
                : isWeeklyOff
                  ? "วันหยุดประจำสัปดาห์"
                  : cell.status === "on_leave"
                    ? "ลาหยุด"
                    : cell.status === "complete" || cell.status === "late"
                      ? "มีบันทึกเช็คอินแล้ว"
                      : cell.status === "future"
                        ? "วันในอนาคต"
                        : "วันทำงานปกติ"}
            </span>
          </div>

          {/* Weekly off note */}
          {isWeeklyOff ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5">
              <Info className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
              <p className="text-xs text-amber-800 leading-relaxed">
                วันหยุดประจำสัปดาห์มาจากการตั้งค่าของพนักงาน
                ไม่สามารถยกเลิกผ่านหน้านี้ได้
              </p>
            </div>
          ) : null}

          {/* Error */}
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 border-t border-border/60 px-5 pb-5 pt-4">
          {isOverride ? (
            /* Can remove override */
            <button
              type="button"
              disabled={loading}
              onClick={removeDayOff}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
            >
              <CalendarCheck className="size-4" />
              {loading ? "กำลังยกเลิก..." : "ยกเลิกวันหยุดพิเศษ"}
            </button>
          ) : !isOff ? (
            /* Can mark as day off */
            <button
              type="button"
              disabled={loading}
              onClick={markDayOff}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-700 transition hover:bg-sky-100 disabled:opacity-50"
            >
              <CalendarOff className="size-4" />
              {loading ? "กำลังบันทึก..." : "ตั้งเป็นวันหยุด"}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-border/80 bg-muted/30 px-4 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted/60"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  )
}
