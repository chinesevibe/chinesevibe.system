import {
  CalendarCheck,
  Clock,
  FileText,
  MapPin,
  MessageCircleWarning,
  Shield,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"

import { StatusPill } from "@/components/brand/StatusPill"
import { COMPLAINT_STATUS_LABELS } from "@/features/complaints/types"
import type { DocType } from "@/features/documents/types"
import type {
  AttendanceException,
  ComplaintReminderItem,
  PendingApprovalItem,
  PendingApprovalKind,
  PendingDocumentGroup,
  PendingRegistrationItem,
} from "@/features/dashboard/widgets-data"
import { cn } from "@/lib/utils"

function IconTile({
  icon: Icon,
  className,
}: {
  icon: LucideIcon
  className?: string
}) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground",
        className
      )}
    >
      <Icon className="size-4" strokeWidth={1.75} aria-hidden />
    </span>
  )
}

function CircleIcon({
  icon: Icon,
  tone = "neutral",
}: {
  icon: LucideIcon
  tone?: "neutral" | "warning" | "danger" | "info" | "success" | "purple"
}) {
  const tones = {
    neutral: "bg-muted/50 text-muted-foreground",
    warning: "bg-amber-50 text-amber-600",
    danger: "bg-red-50 text-red-600",
    info: "bg-sky-50 text-sky-600",
    success: "bg-emerald-50 text-emerald-600",
    purple: "bg-violet-50 text-violet-600",
  }
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full border border-border/50",
        tones[tone]
      )}
    >
      <Icon className="size-4" strokeWidth={1.75} aria-hidden />
    </span>
  )
}

function AvatarInitials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/)
  const initials =
    parts.length >= 2
      ? `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`
      : (parts[0]?.slice(0, 2) ?? "?")
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
      {initials.toUpperCase()}
    </span>
  )
}

const DOC_TYPE_ICON: Record<DocType, LucideIcon> = {
  employment_cert: FileText,
  salary_cert: Wallet,
  tax_cert: Shield,
  other: FileText,
}

const PENDING_APPROVAL_ICON: Record<
  PendingApprovalKind,
  { icon: LucideIcon; tone: "warning" | "danger" | "info" | "purple" }
> = {
  registration: { icon: UserPlus, tone: "warning" },
  onboarding: { icon: UserPlus, tone: "info" },
  leave: { icon: CalendarCheck, tone: "warning" },
  overtime: { icon: Clock, tone: "warning" },
  attendance: { icon: Clock, tone: "info" },
  location_review: { icon: MapPin, tone: "purple" },
}

function EmptyListMessage({ children }: { children: string }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}

function formatExceptionLabel(kind: AttendanceException["kind"]): {
  label: string
  variant: "warning" | "rejected"
} {
  if (kind === "late") {
    return { label: "Late Check-in", variant: "warning" }
  }
  return { label: "Open", variant: "warning" }
}

function formatCreatedAt(iso: string | null): string {
  if (!iso) return "—"
  if (!iso.includes("T")) return iso
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function DocumentApprovalsList({
  items,
}: {
  items: PendingDocumentGroup[]
}) {
  if (items.length === 0) {
    return <EmptyListMessage>ไม่มีคำขอเอกสารรอดำเนินการ</EmptyListMessage>
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.docType} className="flex items-start gap-3">
          <IconTile icon={DOC_TYPE_ICON[item.docType]} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-tight">{item.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              รอการดำเนินการ
            </p>
          </div>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-brand-red">
            {item.count}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function ComplianceRemindersList({
  items,
}: {
  items: ComplaintReminderItem[]
}) {
  if (items.length === 0) {
    return <EmptyListMessage>ไม่มีเรื่องร้องเรียนที่เปิดอยู่</EmptyListMessage>
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3">
          <CircleIcon icon={MessageCircleWarning} tone="warning" />
          <div className="min-w-0 flex-1">
            <Link
              href={`/admin/complaints?status=open`}
              className="block rounded-md transition-colors hover:text-brand-red"
            >
              <p className="text-sm font-medium leading-tight">
                {item.ticketCode} · {item.subject}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {item.isAnonymous
                  ? "ผู้แจ้งไม่เปิดเผยตัวตน"
                  : (item.employeeName ?? "—")}
              </p>
              <div className="mt-1.5">
                <StatusPill
                  label={COMPLAINT_STATUS_LABELS[item.status]}
                  variant="pending"
                />
              </div>
            </Link>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatCreatedAt(item.createdAt)}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function AttendanceExceptionsList({
  items,
}: {
  items: AttendanceException[]
}) {
  if (items.length === 0) {
    return <EmptyListMessage>ไม่มีข้อยกเว้นการเข้างานวันนี้</EmptyListMessage>
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const st = formatExceptionLabel(item.kind)
        return (
          <li key={item.id} className="flex items-center gap-3">
            <AvatarInitials name={item.employeeName} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{item.employeeName}</p>
              <StatusPill label={st.label} variant={st.variant} />
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {item.detail}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export function PendingRegistrationsList({
  items,
}: {
  items: PendingRegistrationItem[]
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">ไม่มีคำขอลงทะเบียนรออนุมัติ</p>
    )
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/admin/employees/${item.id}`}
            className="flex items-start justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2 transition-colors hover:border-brand-red/40 hover:bg-brand-red/5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {[item.branchName, item.phone, item.department]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </p>
            </div>
            <StatusPill label="รออนุมัติ" variant="pending" />
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function RecentHrTicketsList({
  items,
}: {
  items: PendingApprovalItem[]
}) {
  if (items.length === 0) {
    return <EmptyListMessage>ไม่มีรายการรอการอนุมัติ</EmptyListMessage>
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const meta = PENDING_APPROVAL_ICON[item.kind]
        return (
          <li key={item.id} className="flex items-start gap-3">
            <CircleIcon icon={meta.icon} tone={meta.tone} />
            <div className="min-w-0 flex-1">
              <Link
                href={item.href}
                className="block rounded-md transition-colors hover:text-brand-red"
              >
                <p className="text-sm font-medium leading-tight">{item.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.summary}</p>
                <div className="mt-1.5">
                  <StatusPill label="รอดำเนินการ" variant="pending" />
                </div>
              </Link>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatCreatedAt(item.createdAt)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
