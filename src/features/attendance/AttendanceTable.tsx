import Link from "next/link"

import { DataTableShell } from "@/components/brand/DataTableShell"
import { StatusPill } from "@/components/brand/StatusPill"
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

function wholeHours(hours: number | null): string {
  if (hours == null) return "—"
  return String(Math.floor(hours))
}

function rowMeta(row: AttendanceRow): string {
  return [row.branchName, row.department].filter(Boolean).join(" • ") || "—"
}

function employeeLabel(row: AttendanceRow): string {
  return `${row.employeeName} (${row.employeeCode})`
}

export function AttendanceTable({
  rows,
  canManage = false,
  employeeView = false,
}: {
  rows: AttendanceRow[]
  canManage?: boolean
  /** Hide employee/dept columns on single-employee pages */
  employeeView?: boolean
}) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        ไม่พบข้อมูลการเข้างานตามเงื่อนไข
      </p>
    )
  }

  return (
    <DataTableShell>
      <div className="flex flex-col gap-3 border-b border-border/70 bg-muted/10 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">ประวัติบันทึกเวลาเข้างาน</p>
          <p className="text-xs text-muted-foreground">
            เรียงจากวันที่ล่าสุดก่อน และจัดลำดับข้อมูลให้สแกนความผิดปกติได้เร็วขึ้น
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-border/80 bg-background px-3 py-1.5 font-medium text-foreground">
            ทั้งหมด {rows.length} รายการ
          </span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 font-medium text-amber-800">
            มาสาย {rows.filter((row) => row.status === "late").length}
          </span>
          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 font-medium text-sky-800">
            ยังไม่เช็คออก {rows.filter((row) => row.status === "in_progress").length}
          </span>
        </div>
      </div>
      <Table>
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
              เข้า
            </TableHead>
            <TableHead className="bg-[#f7f1e8] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              ออก
            </TableHead>
            <TableHead className="bg-[#f7f1e8] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              ชม.
            </TableHead>
            <TableHead className="bg-[#f7f1e8] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              สถานะ
            </TableHead>
            <TableHead className="bg-[#f7f1e8] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              ตรวจพิกัด
            </TableHead>
            {canManage ? <TableHead className="w-[220px]" /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className="align-top hover:bg-brand-red/5">
              <TableCell className="whitespace-nowrap font-medium tabular-nums text-foreground">
                {row.date}
              </TableCell>
              {!employeeView ? (
                <TableCell className="min-w-[16rem]">
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">
                      <Link
                        href={row.employeeHref}
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
              <TableCell className="font-medium tabular-nums">{row.checkInText}</TableCell>
              <TableCell className="font-medium tabular-nums">{row.checkOutText}</TableCell>
              <TableCell className="font-semibold tabular-nums text-foreground">
                {wholeHours(row.workHours)}
              </TableCell>
              <TableCell>
                <StatusPill
                  label={row.statusLabel}
                  variant={STATUS_VARIANT[row.status]}
                />
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
                    <AttendanceEditButton row={row} />
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
