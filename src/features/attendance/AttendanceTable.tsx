import Link from "next/link"
import { AlertTriangle, Clock3, MapPinned } from "lucide-react"

import { DataTableShell } from "@/components/brand/DataTableShell"
import { DevelopmentEmptyState } from "@/components/brand/DevelopmentEmptyState"
import { StatusPill } from "@/components/brand/StatusPill"
import { buttonVariants } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AttendanceEditButton,
  AttendanceLocationReviewActions,
} from "@/features/attendance/AttendanceHrActions"
import type { AttendanceRow } from "@/features/attendance/types"
import { appendReturnTo } from "@/lib/navigation/return-to"
import { cn } from "@/lib/utils"

const STATUS_VARIANT: Record<
  AttendanceRow["status"],
  "approved" | "warning" | "info"
> = {
  normal: "approved",
  late: "warning",
  in_progress: "info",
}

const REVIEW_VARIANT: Record<
  AttendanceRow["locationReviewStatus"],
  "approved" | "warning" | "info" | "rejected"
> = {
  clear: "approved",
  approved: "approved",
  pending_hr: "info",
  rejected: "rejected",
}

function formatHours(hours: number | null): string {
  if (hours == null) return "—"
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1)
}

function formatOvertimeMinutes(minutes: number): string {
  return minutes > 0 ? `${minutes} นาที` : "—"
}

/** 2026-06-23 → 23.6.2026 */
function formatShortDate(date: string): string {
  const [y, m, d] = date.split("-")
  if (!y || !m || !d) return date
  return `${Number(d)}.${Number(m)}.${y}`
}

function rowMeta(row: AttendanceRow): string {
  return [row.branchName, row.department].filter(Boolean).join(" • ") || "—"
}

function employeeLabel(row: AttendanceRow): string {
  return `${row.employeeName} (${row.employeeCode})`
}

function issueBadges(row: AttendanceRow): string[] {
  const issues: string[] = []
  if (!row.checkOutAt) issues.push("ยังไม่เช็คออก")
  if (row.status === "late") issues.push("มาสาย")
  if (row.shiftCrossesMidnight) issues.push("ข้ามวัน")
  if (row.locationReviewStatus === "pending_hr") issues.push("รอตรวจพิกัด")
  if (row.locationReviewStatus === "rejected") issues.push("พิกัดถูกปฏิเสธ")
  if (row.locationReviewFlags.length > 0 && row.locationReviewStatus !== "pending_hr") {
    issues.push("มีธงพิกัด")
  }
  return issues
}

function issueTone(label: string): string {
  if (label === "ยังไม่เช็คออก" || label === "พิกัดถูกปฏิเสธ") {
    return "border-rose-200 bg-rose-50 text-rose-700"
  }
  if (label === "มาสาย" || label === "รอตรวจพิกัด") {
    return "border-amber-200 bg-amber-50 text-amber-800"
  }
  if (label === "ข้ามวัน") {
    return "border-violet-200 bg-violet-50 text-violet-700"
  }
  return "border-border/70 bg-background text-muted-foreground"
}

function MobileRowCard({
  row,
  canManage,
  employeeView,
  returnTo,
}: {
  row: AttendanceRow
  canManage: boolean
  employeeView: boolean
  returnTo?: string | null
}) {
  const issues = issueBadges(row)
  const hasAbnormalIssue = issues.length > 0

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 shadow-sm",
        employeeView && hasAbnormalIssue
          ? "border-amber-300/70 bg-amber-50/40"
          : "border-border/70 bg-background"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {employeeView ? (
            <>
              <p className="text-sm font-semibold tabular-nums text-foreground">{formatShortDate(row.date)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {row.status === "in_progress" ? "เปิดรอบอยู่" : "ปิดรอบแล้ว"}
              </p>
            </>
          ) : (
            <>
              <Link
                href={appendReturnTo(row.employeeHref, returnTo)}
                className="block truncate font-semibold text-foreground hover:text-brand-red hover:underline"
              >
                {row.employeeName}
              </Link>
              <p className="text-xs font-medium tabular-nums text-muted-foreground">{row.employeeCode}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{rowMeta(row)}</p>
            </>
          )}
        </div>
        <StatusPill label={row.statusLabel} variant={STATUS_VARIANT[row.status]} />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl bg-muted/30 px-3 py-2">
          <p className="text-xs text-muted-foreground">กะงาน</p>
          <p
            className={cn(
              "font-medium text-foreground",
              employeeView ? "break-words leading-snug" : "truncate"
            )}
          >
            {row.shiftName ?? "—"}
          </p>
          <p className="break-words text-xs text-muted-foreground">
            {row.shiftTimeText ?? "ยังไม่กำหนดเวลา"}
            {row.shiftCrossesMidnight ? " • ข้ามวัน" : ""}
          </p>
        </div>
        <div className="rounded-xl bg-muted/30 px-3 py-2">
          <p className="text-xs text-muted-foreground">{employeeView ? "สถานะรอบ" : "วันที่"}</p>
          <p className="font-medium tabular-nums text-foreground">
            {employeeView ? (row.status === "in_progress" ? "เปิดรอบอยู่" : "ปิดรอบแล้ว") : formatShortDate(row.date)}
          </p>
        </div>
        <div className="rounded-xl bg-muted/30 px-3 py-2">
          <p className="text-xs text-muted-foreground">เวลาเข้า-ออก</p>
          <p className="font-medium tabular-nums text-foreground">
            {row.checkInText} - {row.checkOutText}
          </p>
        </div>
        <div className="rounded-xl bg-muted/30 px-3 py-2">
          <p className="text-xs text-muted-foreground">ชั่วโมงทำงาน</p>
          <p className="font-medium tabular-nums text-foreground">{formatHours(row.workHours)}</p>
        </div>
        <div className="rounded-xl bg-muted/30 px-3 py-2">
          <p className="text-xs text-muted-foreground">OT ที่อนุมัติ</p>
          <p className="font-medium tabular-nums text-foreground">{formatOvertimeMinutes(row.overtimeMinutes)}</p>
          <p className="text-xs text-muted-foreground">{row.overtimeMinutes > 0 ? `${formatHours(row.overtimeHours)} ชม.` : "ยังไม่มี OT"}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {issues.length > 0 ? (
          issues.map((issue) => (
            <span
              key={`${row.id}-${issue}`}
              className={cn(
                "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                issueTone(issue)
              )}
            >
              {issue}
            </span>
          ))
        ) : (
          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            ไม่มีเคสผิดปกติ
          </span>
        )}
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-start gap-2">
          <StatusPill
            label={row.locationReviewLabel}
            variant={REVIEW_VARIANT[row.locationReviewStatus]}
          />
          {row.locationReviewFlags.length > 0 ? (
            <p className="min-w-0 break-words text-xs text-muted-foreground">
              {row.locationReviewFlags.join(", ")}
            </p>
          ) : null}
        </div>
        {canManage ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <AttendanceEditButton row={row} />
              {!employeeView ? (
                <Link
                  href={appendReturnTo(row.employeeHref, returnTo)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  เปิดประวัติ
                </Link>
              ) : null}
            </div>
            <AttendanceLocationReviewActions row={row} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function AttendanceTable({
  rows,
  canManage = false,
  employeeView = false,
  returnTo,
}: {
  rows: AttendanceRow[]
  canManage?: boolean
  /** Hide employee/dept columns on single-employee pages */
  employeeView?: boolean
  returnTo?: string | null
}) {
  const summary = rows.reduce(
    (acc, row) => {
      if (row.status === "late") acc.late += 1
      if (row.status === "in_progress") {
        acc.inProgress += 1
      }
      if (row.locationReviewStatus === "pending_hr") acc.pendingReview += 1
      return acc
    },
    { late: 0, inProgress: 0, pendingReview: 0, flagged: 0 }
  )
  for (const row of rows) {
    if (issueBadges(row).length > 0) summary.flagged += 1
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-background">
        <DevelopmentEmptyState
          icon={Clock3}
          title={
            employeeView
              ? "ยังไม่มีประวัติการเข้างานของพนักงานในช่วงนี้"
              : "ไม่พบข้อมูลการเข้างานตามเงื่อนไข"
          }
          description={
            employeeView
              ? "ลองเปลี่ยนช่วงวันที่ หรือเพิ่มบันทึกเวลาเมื่อพนักงานมีการลงเวลาแล้ว"
              : "ลองเปลี่ยนช่วงวันที่ พนักงาน กะงาน หรือเคสที่ต้องโฟกัส"
          }
        />
      </div>
    )
  }

  return (
    <DataTableShell>
      {/* ── employeeView: compact single-row header ── */}
      {employeeView ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-gradient-to-br from-background to-muted/20 px-3 py-2.5">
          <p className="text-xs font-semibold text-foreground">ประวัติการเข้างานย้อนหลัง</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { label: `${rows.length} รายการ`, cls: "border-border/80 bg-background text-foreground" },
              { label: `มาสาย ${summary.late}`, cls: "border-amber-200 bg-amber-50 text-amber-800" },
              { label: `ไม่เช็คออก ${summary.inProgress}`, cls: "border-sky-200 bg-sky-50 text-sky-800" },
              { label: `จับตา ${summary.flagged}`, cls: "border-violet-200 bg-violet-50 text-violet-700" },
              { label: `ตรวจพิกัด ${summary.pendingReview}`, cls: "border-rose-200 bg-rose-50 text-rose-700" },
            ].map(({ label, cls }) => (
              <span key={label} className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", cls)}>
                {label}
              </span>
            ))}
          </div>
        </div>
      ) : (
        /* ── full mode: original 2-row header ── */
        <div className="border-b border-border/70 bg-gradient-to-br from-background via-background to-muted/20">
          <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Attendance audit ledger</p>
              <p className="text-xs text-muted-foreground">
                เรียงจากวันที่ล่าสุดก่อน พร้อมเน้นรายการผิดปกติให้สแกนได้เร็วกว่าเดิม
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-border/80 bg-background px-2.5 py-1 text-[11px] font-medium text-foreground md:px-3 md:py-1.5 md:text-xs">
                ทั้งหมด {rows.length} รายการ
              </span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800 md:px-3 md:py-1.5 md:text-xs">
                มาสาย {summary.late}
              </span>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-800 md:px-3 md:py-1.5 md:text-xs">
                ยังไม่เช็คออก {summary.inProgress}
              </span>
              <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700 md:px-3 md:py-1.5 md:text-xs">
                ต้องจับตา {summary.flagged}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-border/60 px-4 pb-4 pt-0 md:px-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-700 md:px-3 md:py-1.5 md:text-xs">
              <AlertTriangle className="size-3.5" />
              รอตรวจพิกัด {summary.pendingReview}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700 md:px-3 md:py-1.5 md:text-xs">
              <Clock3 className="size-3.5" />
              เปิดรอบอยู่ {rows.filter((row) => row.status === "in_progress").length}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground md:px-3 md:py-1.5 md:text-xs">
              <MapPinned className="size-3.5" />
              location review แสดงคู่กับรายการทันที
            </span>
          </div>
        </div>
      )}
      <div className="grid gap-3 p-3 lg:hidden">
        {rows.map((row) => (
          <MobileRowCard
            key={row.id}
            row={row}
            canManage={canManage}
            employeeView={employeeView}
            returnTo={returnTo}
          />
        ))}
      </div>
      <Table className="hidden lg:table">
        <TableHeader>
          <TableRow>
            <TableHead className="bg-[#f7f1e8] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              วันที่
            </TableHead>
            {!employeeView ? (
              <TableHead className="bg-[#f7f1e8] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                พนักงาน
              </TableHead>
            ) : null}
            {!employeeView ? (
              <TableHead className="bg-[#f7f1e8] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                ทีม / จุดงาน
              </TableHead>
            ) : null}
            <TableHead className="bg-[#f7f1e8] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              กะ
            </TableHead>
            <TableHead className="bg-[#f7f1e8] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              เข้า
            </TableHead>
            <TableHead className="bg-[#f7f1e8] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              ออก
            </TableHead>
            <TableHead className="bg-[#f7f1e8] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              ชม.
            </TableHead>
            <TableHead className="bg-[#f7f1e8] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              OT
            </TableHead>
            <TableHead className="bg-[#f7f1e8] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              สถานะ
            </TableHead>
            <TableHead className="bg-[#f7f1e8] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              ตรวจพิกัด
            </TableHead>
            {canManage ? <TableHead className="w-[260px] min-w-[260px]" /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              className={cn(
                "align-top border-b border-border/60 hover:bg-brand-red/5",
                employeeView && issueBadges(row).length > 0 && "bg-amber-50/30"
              )}
            >
              <TableCell className="whitespace-nowrap font-medium tabular-nums text-foreground">
                <div className="space-y-1">
                  <p className="font-semibold tabular-nums text-foreground">{formatShortDate(row.date)}</p>
                  <p className="text-xs text-muted-foreground">{row.status === "in_progress" ? "เปิดรอบอยู่" : "ปิดรอบแล้ว"}</p>
                </div>
              </TableCell>
              {!employeeView ? (
                <TableCell className="min-w-[16rem]">
                  <div className="space-y-1.5">
                    <p className="font-semibold text-foreground">
                      <Link
                        href={appendReturnTo(row.employeeHref, returnTo)}
                        className="transition hover:text-brand-red hover:underline hover:underline-offset-4"
                      >
                        {employeeLabel(row)}
                      </Link>
                    </p>
                    <p className="text-xs text-muted-foreground">{rowMeta(row)}</p>
                  </div>
                </TableCell>
              ) : null}
            {!employeeView ? (
              <TableCell className="min-w-[13rem]">
                <div className="space-y-1">
                    <p className="font-medium text-foreground">{row.department ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{row.branchName ?? "—"}</p>
                </div>
              </TableCell>
            ) : null}
              <TableCell className="whitespace-nowrap tabular-nums">
                <p className="font-medium text-foreground">
                  {row.shiftTimeText ?? "—"}
                  {row.shiftCrossesMidnight ? " ✦" : ""}
                </p>
              </TableCell>
              <TableCell className="font-medium tabular-nums">{row.checkInText}</TableCell>
              <TableCell className="font-medium tabular-nums">{row.checkOutText}</TableCell>
              <TableCell className="font-semibold tabular-nums text-foreground">
                <div className="space-y-1">
                  <p className="font-semibold tabular-nums text-foreground">{formatHours(row.workHours)}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.workHours == null ? "รอคำนวณ" : "ชั่วโมงจริงหลังตัดกะ"}
                    {row.shiftCrossesMidnight ? " • overnight" : ""}
                  </p>
                </div>
              </TableCell>
              <TableCell className="font-semibold tabular-nums text-foreground">
                <div className="space-y-1">
                  <p className="font-semibold tabular-nums text-foreground">{formatOvertimeMinutes(row.overtimeMinutes)}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.overtimeMinutes > 0 ? `${formatHours(row.overtimeHours)} ชม. ที่อนุมัติ` : "ยังไม่มี OT"}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-2">
                  <StatusPill
                    label={row.statusLabel}
                    variant={STATUS_VARIANT[row.status]}
                  />
                  {issueBadges(row).length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {issueBadges(row).map((issue) => (
                        <span
                          key={`${row.id}-${issue}`}
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
                            issueTone(issue)
                          )}
                        >
                          {issue}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="min-w-[12rem]">
                <div className="space-y-1">
                  <StatusPill
                    label={row.locationReviewLabel}
                    variant={REVIEW_VARIANT[row.locationReviewStatus]}
                  />
                  {row.locationReviewFlags.length > 0 ? (
                    <p className="max-w-xs text-xs text-muted-foreground">
                      {row.locationReviewFlags.join(", ")}
                    </p>
                  ) : null}
                </div>
              </TableCell>
              {canManage ? (
                <TableCell>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <AttendanceEditButton row={row} />
                      {!employeeView ? (
                        <Link
                          href={appendReturnTo(row.employeeHref, returnTo)}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          เปิดประวัติ
                        </Link>
                      ) : null}
                    </div>
                    <AttendanceLocationReviewActions row={row} />
                  </div>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTableShell>
  )
}
