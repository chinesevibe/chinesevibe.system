"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Briefcase,
  CalendarDays,
  Clock,
  FileText,
  MapPin,
  MessageSquareWarning,
  RefreshCw,
  UserPlus,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useLocale } from "@/features/portal/LocaleProvider"
import type { HrApprovalCounts } from "@/features/notifications/nav-badges"
import {
  PENDING_QUEUE_CATEGORIES,
  type PendingQueueCategory,
  type PendingQueueItem,
} from "@/lib/approvals/pending-queue-types"
import { canApproveHrRequests } from "@/lib/auth/roles"
import type { Employee } from "@/lib/auth/session"
import type { MessageKey } from "@/lib/i18n/translate"
import { cn } from "@/lib/utils"

const CATEGORY_META: Record<
  PendingQueueCategory,
  { icon: LucideIcon; accent: string; pill: string }
> = {
  registration: {
    icon: UserPlus,
    accent: "border-l-[#B71C1C]",
    pill: "bg-[#FFF5F5] text-[#B71C1C] ring-[#FECACA]",
  },
  leave: {
    icon: CalendarDays,
    accent: "border-l-[#2563EB]",
    pill: "bg-[#EFF6FF] text-[#1D4ED8] ring-[#BFDBFE]",
  },
  overtime: {
    icon: Clock,
    accent: "border-l-brand-red",
    pill: "bg-[#FFF5F5] text-brand-red ring-[#FECACA]",
  },
  document: {
    icon: FileText,
    accent: "border-l-[#7B1FA2]",
    pill: "bg-[#F3E8FF] text-[#6B21A8] ring-[#E9D5FF]",
  },
  complaint: {
    icon: MessageSquareWarning,
    accent: "border-l-[#D97706]",
    pill: "bg-[#FFFBEB] text-[#B45309] ring-[#FDE68A]",
  },
  attendance: {
    icon: MapPin,
    accent: "border-l-[#059669]",
    pill: "bg-[#ECFDF5] text-[#047857] ring-[#A7F3D0]",
  },
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase()
}

function categoryCount(
  category: PendingQueueCategory,
  counts: HrApprovalCounts
): number {
  switch (category) {
    case "registration":
      return counts.registration + counts.onboarding
    case "leave":
      return counts.leaveHr
    case "overtime":
      return counts.overtime
    case "document":
      return counts.document
    case "complaint":
      return counts.complaint
    case "attendance":
      return counts.attendance
  }
}

function categoryLabel(category: PendingQueueCategory, tx: (key: MessageKey) => string): string {
  const map: Record<PendingQueueCategory, MessageKey> = {
    registration: "line.pendingQueue.registration",
    leave: "line.pendingQueue.leave",
    overtime: "line.pendingQueue.overtime",
    document: "line.pendingQueue.document",
    complaint: "line.pendingQueue.complaint",
    attendance: "line.pendingQueue.attendance",
  }
  return tx(map[category])
}

type QueueCardProps = {
  item: PendingQueueItem
  canDecideHr: boolean
  onDone: (id: string) => void
  onError: (message: string | null) => void
}

function QueueCard({ item, canDecideHr, onDone, onError }: QueueCardProps) {
  const { tx } = useLocale()
  const meta = CATEGORY_META[item.category]
  const Icon = meta.icon
  const [busy, setBusy] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [replyOpen, setReplyOpen] = useState(false)
  const [note, setNote] = useState("")

  const blocked = item.requiresHrOfficer && !canDecideHr

  async function submitStandard(action: "approve" | "reject") {
    if (action === "reject" && note.trim().length < 3) {
      onError(tx("liff.approvals.rejectNoteRequired"))
      return
    }

    setBusy(true)
    onError(null)
    try {
      const res = await fetch(item.decidePath, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          note: action === "reject" ? note.trim() : undefined,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(data?.error ?? tx("liff.approvals.actionFailed"))
      }
      onDone(item.id)
    } catch (error) {
      onError(error instanceof Error ? error.message : tx("liff.approvals.actionFailed"))
    } finally {
      setBusy(false)
    }
  }

  async function submitComplaint(close: boolean) {
    if (note.trim().length < 3) {
      onError(tx("liff.approvals.replyNoteRequired"))
      return
    }
    setBusy(true)
    onError(null)
    try {
      const res = await fetch(item.decidePath, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: note.trim(), close }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(data?.error ?? tx("liff.approvals.actionFailed"))
      }
      onDone(item.id)
    } catch (error) {
      onError(error instanceof Error ? error.message : tx("liff.approvals.actionFailed"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm",
        "border-l-4",
        meta.accent
      )}
    >
      <div className="flex gap-3 p-4">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold",
            meta.pill
          )}
          aria-hidden
        >
          {initials(item.title)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start justify-between gap-2">
            <p className="text-[15px] font-semibold leading-snug text-foreground">
              {item.title}
            </p>
            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </div>
          {item.subtitle ? (
            <p className="text-sm text-foreground/80">{item.subtitle}</p>
          ) : null}
          {item.meta ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{item.meta}</p>
          ) : null}
          {blocked ? (
            <p className="mt-2 text-xs text-amber-700">{tx("liff.approvals.hrOfficerOnly")}</p>
          ) : null}
        </div>
      </div>

      {!blocked ? (
        <div className="space-y-2 border-t border-border/60 bg-muted/20 px-4 py-3">
          {item.kind === "complaint" ? (
            <>
              {replyOpen ? (
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={tx("liff.approvals.complaintPlaceholder")}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-red/25"
                />
              ) : null}
              <div className="flex flex-wrap gap-2">
                {!replyOpen ? (
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1 rounded-xl"
                    disabled={busy}
                    onClick={() => {
                      setRejectOpen(false)
                      setReplyOpen(true)
                    }}
                  >
                    {tx("liff.approvals.complaintReply")}
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1 rounded-xl"
                      disabled={busy}
                      onClick={() => submitComplaint(false)}
                    >
                      {tx("liff.approvals.complaintSend")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="flex-1 rounded-xl"
                      disabled={busy}
                      onClick={() => submitComplaint(true)}
                    >
                      {tx("liff.approvals.complaintClose")}
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              {rejectOpen ? (
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={tx("liff.approvals.rejectPlaceholder")}
                  rows={2}
                  className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-red/25"
                />
              ) : null}
              <div className="flex gap-2">
                {rejectOpen ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="flex-1 rounded-xl"
                      disabled={busy}
                      onClick={() => submitStandard("reject")}
                    >
                      {tx("liff.approvals.confirmReject")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="rounded-xl"
                      disabled={busy}
                      onClick={() => {
                        setRejectOpen(false)
                        setNote("")
                      }}
                    >
                      {tx("liff.approvals.cancel")}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1 rounded-xl bg-brand-red hover:bg-brand-red/90"
                      disabled={busy}
                      onClick={() => submitStandard("approve")}
                    >
                      {tx("line.approval.approve")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="flex-1 rounded-xl"
                      disabled={busy}
                      onClick={() => setRejectOpen(true)}
                    >
                      {tx("line.approval.reject")}
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      ) : null}
    </article>
  )
}

export function ApprovalsLiffContent({
  initialItems,
  initialCounts,
  initialTotal,
  callerRole,
}: {
  initialItems: PendingQueueItem[]
  initialCounts: HrApprovalCounts
  initialTotal: number
  callerRole: Employee["role"]
}) {
  const { tx } = useLocale()
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [counts, setCounts] = useState(initialCounts)
  const [total, setTotal] = useState(initialTotal)
  const [active, setActive] = useState<PendingQueueCategory | "all">("all")
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canDecideHr = canApproveHrRequests(callerRole)

  const visible = useMemo(() => {
    if (active === "all") return items
    return items.filter((item) => item.category === active)
  }, [active, items])

  const tabs = useMemo(
    () =>
      PENDING_QUEUE_CATEGORIES.map((category) => ({
        category,
        count: categoryCount(category, counts),
      })),
    [counts]
  )

  async function refresh() {
    setRefreshing(true)
    setError(null)
    try {
      const res = await fetch("/api/approvals/pending-queue")
      if (!res.ok) throw new Error(tx("liff.approvals.loadFailed"))
      const data = (await res.json()) as {
        items: PendingQueueItem[]
        counts: HrApprovalCounts
        total: number
      }
      setItems(data.items)
      setCounts(data.counts)
      setTotal(data.total)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : tx("liff.approvals.loadFailed"))
    } finally {
      setRefreshing(false)
    }
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id))
    setTotal((prev) => Math.max(0, prev - 1))
    void refresh()
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur-md">
        <div className="bg-gradient-to-br from-brand-red to-[#8B0000] px-4 pb-4 pt-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-white/80">
                HR
              </p>
              <h1 className="text-xl font-bold tracking-tight">
                {tx("liff.approvals.title")}
              </h1>
              <p className="mt-1 text-sm text-white/85">
                {tx("line.pendingQueue.items", { count: String(total) })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={refreshing}
              className="flex size-10 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25 disabled:opacity-60"
              aria-label={tx("liff.approvals.refresh")}
            >
              <RefreshCw
                className={cn("size-5", refreshing && "animate-spin")}
                aria-hidden
              />
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto px-4 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setActive("all")}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition",
              active === "all"
                ? "bg-brand-red text-white shadow-sm"
                : "bg-muted text-muted-foreground"
            )}
          >
            {tx("liff.approvals.all")} ({total})
          </button>
          {tabs.map(({ category, count }) => (
            <button
              key={category}
              type="button"
              onClick={() => setActive(category)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition",
                active === category
                  ? "bg-brand-red text-white shadow-sm"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {categoryLabel(category, tx)} ({count})
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 space-y-3 p-4 pb-8">
        {error ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
            <Briefcase className="mb-3 size-10 text-muted-foreground/60" aria-hidden />
            <p className="text-base font-medium text-foreground">
              {tx("liff.approvals.emptyTitle")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {tx("line.pendingQueue.empty")}
            </p>
          </div>
        ) : (
          visible.map((item) => (
            <QueueCard
              key={`${item.category}-${item.id}`}
              item={item}
              canDecideHr={canDecideHr}
              onDone={removeItem}
              onError={setError}
            />
          ))
        )}
      </div>
    </main>
  )
}
