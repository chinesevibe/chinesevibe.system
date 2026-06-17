import {
  CalendarCheck,
  Clock,
  FileText,
  MapPin,
  MessageCircleWarning,
  Shield,
  ShieldAlert,
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
  ComplianceReminderItem,
  HrAttendanceIssue,
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

const COMPLIANCE_KIND_ICON: Record<
  ComplianceReminderItem["kind"],
  { icon: LucideIcon; tone: "warning" | "danger" | "info" }
> = {
  probation: { icon: CalendarCheck, tone: "warning" },
  visa: { icon: ShieldAlert, tone: "danger" },
  work_permit: { icon: Shield, tone: "info" },
}

export function ComplianceExpiringList({
  items,
}: {
  items: ComplianceReminderItem[]
}) {
  if (items.length === 0) {
    return (
      <EmptyListMessage>
        ไม่มีทดลองงาน / วีซ่า / Work Permit ใกล้ครบหรือหมดอายุแล้ว
      </EmptyListMessage>
    )
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const meta = COMPLIANCE_KIND_ICON[item.kind]
        const tone = item.urgency === "expired" ? "danger" : meta.tone
        return (
          <li key={item.id} className="flex items-start gap-3">
            <CircleIcon icon={meta.icon} tone={tone} />
            <div className="min-w-0 flex-1">
              <Link
                href={item.href}
                className="block rounded-md transition-colors hover:text-brand-red"
              >
                <div className="flex items-center justify-between gap-1">
                  <p className="text-sm font-medium leading-tight">{item.name}</p>
                  {item.urgency === "expired" ? (
                    <span className="shrink-0 rounded bg-red-100 px-1 py-px text-[9px] font-semibold text-red-700">
                      หมดอายุ
                    </span>
                  ) : item.urgency === "urgent" ? (
                    <span className="shrink-0 rounded bg-brand-red/10 px-1 py-px text-[9px] font-semibold text-brand-red">
                      ด่วน
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.title}
                  {item.department ? ` · ${item.department}` : ""}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.daysLeft < 0
                    ? `หมดอายุแล้ว ${Math.abs(item.daysLeft)} วัน (${item.dueDate})`
                    : `เหลือ ${item.daysLeft} วัน (${item.dueDate})`}
                </p>
              </Link>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function OpenComplaintsList({
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
              href="/admin/complaints?status=open"
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

/** @deprecated Use OpenComplaintsList */
export function ComplianceRemindersList({
  items,
}: {
  items: ComplaintReminderItem[]
}) {
  return <OpenComplaintsList items={items} />
}

export function AttendanceIssuesList({
  items,
}: {
  items: HrAttendanceIssue[]
}) {
  if (items.length === 0) {
    return (
      <EmptyListMessage>ไม่มีรายการลืมเช็คเข้า/ออกที่ต้องติดตาม</EmptyListMessage>
    )
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={`${item.employeeId}-${item.workDate}-${item.issue}`}>
          <Link
            href={item.href}
            className="flex items-center gap-3 rounded-md transition-colors hover:text-brand-red"
          >
            <AvatarInitials name={item.employeeName} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{item.employeeName}</p>
              <p className="text-xs text-muted-foreground">
                {item.workDate} ·{" "}
                {item.issue === "missing_checkin" ? "ลืมเช็คเข้า" : "ลืมเช็คออก"}
              </p>
              <StatusPill
                label={item.retroEligible ? "แก้ได้ (48 ชม.)" : "ติดต่อ HR"}
                variant={item.retroEligible ? "pending" : "rejected"}
              />
            </div>
          </Link>
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
