import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { DataTableShell } from "@/components/brand/DataTableShell"
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
import type { InvRequisitionRow, InvRequisitionStatus } from "@/features/inventory/types"
import { formatThaiDate } from "@/lib/datetime/thailand"
import { cn } from "@/lib/utils"

export const REQUISITION_STATUS_LABELS: Record<InvRequisitionStatus, string> = {
  draft: "แบบร่าง",
  pending: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  issued: "จ่ายของแล้ว",
  completed: "รับครบแล้ว",
  rejected: "ปฏิเสธ",
}

function statusVariant(status: InvRequisitionStatus) {
  if (status === "completed") return "approved" as const
  if (status === "pending" || status === "approved" || status === "issued") {
    return "pending" as const
  }
  return "neutral" as const
}

export function RequisitionListTable({
  requisitions,
  detailBasePath = "/admin/inventory/requisition",
}: {
  requisitions: InvRequisitionRow[]
  detailBasePath?: string
}) {
  return (
    <>
      <div className="grid gap-3 md:hidden">
        {requisitions.length > 0 ? (
          requisitions.map((row) => (
            <div key={row.id} className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{row.requester_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {row.branch_name} · {row.warehouse_name}
                  </p>
                </div>
                <StatusPill
                  label={REQUISITION_STATUS_LABELS[row.status]}
                  variant={statusVariant(row.status)}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="text-[11px] text-muted-foreground">วันที่สร้าง</p>
                  <p className="text-sm font-semibold">{formatThaiDate(row.created_at)}</p>
                </div>
                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="text-[11px] text-muted-foreground">จำนวนรายการ</p>
                  <p className="text-lg font-semibold tabular-nums">{row.item_count}</p>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Link
                  href={`${detailBasePath}/${row.id}`}
                  className={cn(
                    buttonVariants({ size: "sm", variant: "outline" }),
                    "inline-flex items-center gap-1"
                  )}
                >
                  ดูงาน
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            ยังไม่มีใบเบิก
          </div>
        )}
      </div>

      <div className="hidden md:block">
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>วันที่</TableHead>
                <TableHead>ผู้ขอ</TableHead>
                <TableHead>สาขา</TableHead>
                <TableHead>คลัง</TableHead>
                <TableHead>รายการ</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">ดู</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requisitions.length > 0 ? (
                requisitions.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatThaiDate(row.created_at)}</TableCell>
                    <TableCell>{row.requester_name}</TableCell>
                    <TableCell>{row.branch_name}</TableCell>
                    <TableCell>{row.warehouse_name}</TableCell>
                    <TableCell>{row.item_count}</TableCell>
                    <TableCell>
                      <StatusPill
                        label={REQUISITION_STATUS_LABELS[row.status]}
                        variant={statusVariant(row.status)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`${detailBasePath}/${row.id}`}
                        className={cn(
                          buttonVariants({ size: "sm", variant: "outline" }),
                          "inline-flex items-center gap-1"
                        )}
                      >
                        ดูงาน
                        <ArrowUpRight className="size-3.5" aria-hidden />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    ยังไม่มีใบเบิก
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DataTableShell>
      </div>
    </>
  )
}
