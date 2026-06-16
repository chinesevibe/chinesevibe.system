"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import {
  AlertTriangle,
  Bell,
  BellOff,
  CalendarDays,
  ClipboardList,
  Clock,
  FileText,
  MessageCircleWarning,
  PackagePlus,
  Timer,
  TrendingDown,
  UserPlus,
  type LucideIcon,
} from "lucide-react"

import { useAdminNotifications } from "@/components/admin/AdminNotificationProvider"
import {
  NOTIFICATION_LIST_LIMIT,
  type NotificationKind,
} from "@/features/notifications/types"
import { formatThaiDate } from "@/lib/datetime/thailand"
import { cn } from "@/lib/utils"

const KIND_META: Record<
  NotificationKind,
  { icon: LucideIcon; tone: string }
> = {
  registration: { icon: UserPlus, tone: "text-brand-red" },
  onboarding: { icon: UserPlus, tone: "text-amber-700" },
  leave: { icon: CalendarDays, tone: "text-sky-600" },
  attendance: { icon: Clock, tone: "text-amber-600" },
  overtime: { icon: Timer, tone: "text-violet-600" },
  document: { icon: FileText, tone: "text-emerald-600" },
  complaint: { icon: MessageCircleWarning, tone: "text-orange-600" },
  probation: { icon: CalendarDays, tone: "text-amber-700" },
  visa: { icon: CalendarDays, tone: "text-rose-600" },
  work_permit: { icon: CalendarDays, tone: "text-indigo-600" },
  inbound: { icon: PackagePlus, tone: "text-brand-red" },
  requisition: { icon: ClipboardList, tone: "text-sky-600" },
  damage: { icon: AlertTriangle, tone: "text-orange-600" },
  low_stock: { icon: TrendingDown, tone: "text-amber-700" },
}

function formatWhen(iso: string | null): string {
  if (!iso) return ""
  if (Number.isNaN(new Date(iso).getTime())) return iso.slice(0, 10)
  return formatThaiDate(iso, {
    day: "numeric",
    month: "short",
    ...(iso.includes("T")
      ? { hour: "2-digit" as const, minute: "2-digit" as const }
      : {}),
  })
}

function formatBadgeCount(count: number): string {
  if (count > 99) return "99+"
  return String(count)
}

export function AdminNotificationBell({
  showComplianceLink = true,
}: {
  showComplianceLink?: boolean
}) {
  const { inbox, loading, refresh, soundMuted, setSoundMuted } =
    useAdminNotifications()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const approvalTotal = inbox.approvalTotal
  const total = inbox.total
  const complianceTotal = inbox.complianceTotal
  const items = inbox.items.slice(0, NOTIFICATION_LIST_LIMIT)

  const toggleOpen = () => {
    setOpen((wasOpen) => {
      const next = !wasOpen
      if (next) void refresh({ showLoading: true })
      return next
    })
  }

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={
          approvalTotal > 0
            ? `การแจ้งเตือน — รออนุมัติ ${approvalTotal} รายการ`
            : "การแจ้งเตือน"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className="size-5" />
        {approvalTotal > 0 ? (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-red px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white"
            aria-hidden
          >
            {formatBadgeCount(approvalTotal)}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="รายการแจ้งเตือน"
          className="absolute right-0 top-full z-50 mt-1.5 w-[min(19rem,calc(100vw-1.5rem))] overflow-hidden rounded-lg border border-border/80 bg-white shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-border/60 px-2.5 py-2">
            <div>
              <p className="text-xs font-semibold">การแจ้งเตือน</p>
              <p className="text-[10px] text-muted-foreground">
                อัปเดตอัตโนมัติทุก 30 วินาที
              </p>
            </div>
            {loading ? (
              <span className="text-xs text-muted-foreground">กำลังโหลด…</span>
            ) : (
              <span className="text-xs text-muted-foreground">
                {approvalTotal > 0 ? (
                  <>
                    รออนุมัติ{" "}
                    <span className="font-semibold text-brand-red">
                      {approvalTotal}
                    </span>
                  </>
                ) : (
                  "ไม่มีรายการรออนุมัติ"
                )}
                {complianceTotal > 0
                  ? ` · แจ้งเตือน ${complianceTotal}`
                  : null}
              </span>
            )}
          </div>

          <div className="max-h-[17.5rem] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-2.5 py-4 text-center text-xs text-muted-foreground">
                ไม่มีรายการค้าง
              </p>
            ) : (
              <ul className="divide-y divide-border/40">
                {items.map((item) => {
                  const meta = KIND_META[item.kind]
                  const Icon = meta.icon
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="flex gap-2 px-2 py-1.5 transition-colors hover:bg-muted/50"
                      >
                        <span
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-md bg-muted/60",
                            meta.tone
                          )}
                        >
                          <Icon className="size-3.5" strokeWidth={1.75} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="truncate text-[11px] font-medium leading-tight">
                              {item.title}
                            </p>
                            {item.urgency === "urgent" ? (
                              <span className="shrink-0 rounded bg-brand-red/10 px-1 py-px text-[9px] font-semibold text-brand-red">
                                ด่วน
                              </span>
                            ) : null}
                          </div>
                          <p className="line-clamp-1 text-[10px] leading-snug text-muted-foreground">
                            {item.summary}
                          </p>
                          {item.createdAt ? (
                            <p className="text-[9px] text-muted-foreground/75">
                              {formatWhen(item.createdAt)}
                            </p>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-0.5 border-t border-border/60 bg-muted/20 px-2.5 py-1.5">
            {total > NOTIFICATION_LIST_LIMIT ? (
              <p className="text-center text-[9px] text-muted-foreground">
                แสดง {NOTIFICATION_LIST_LIMIT} จาก {total} รายการ
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setSoundMuted(!soundMuted)}
              className="flex items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground"
            >
              {soundMuted ? (
                <BellOff className="size-3" />
              ) : (
                <Bell className="size-3" />
              )}
              {soundMuted ? "เปิดเสียงแจ้งเตือน" : "ปิดเสียงแจ้งเตือน"}
            </button>
            {showComplianceLink ? (
              <Link
                href="/admin/alerts"
                onClick={() => setOpen(false)}
                className="text-center text-[10px] font-medium text-brand-red hover:underline"
              >
                ดูแจ้งเตือนทดลองงาน / วีซ่า / Work Permit
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
