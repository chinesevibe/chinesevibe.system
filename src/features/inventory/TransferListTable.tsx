"use client"

import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { StatusPill } from "@/components/brand/StatusPill"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { InvTransferRow } from "@/features/inventory/actions/transfer"
import { formatThaiDate } from "@/lib/datetime/thailand"

function statusVariant(status: InvTransferRow["status"]) {
  if (status === "received") return "approved" as const
  if (status === "in_transit") return "pending" as const
  if (status === "cancelled") return "rejected" as const
  return "neutral" as const
}

const STATUS_LABELS: Record<InvTransferRow["status"], string> = {
  draft: "ร่าง",
  in_transit: "กำลังโอน",
  received: "รับแล้ว",
  cancelled: "ยกเลิก",
}

function nextStepCopy(status: InvTransferRow["status"]) {
  if (status === "draft") return "รอตรวจรายการและส่งออกจากต้นทาง"
  if (status === "in_transit") return "รอปลายทางตรวจของและยืนยันรับ"
  if (status === "received") return "ปิดงานแล้ว"
  return "ใบโอนนี้ถูกยกเลิกแล้ว"
}

function actionLabel(status: InvTransferRow["status"]) {
  if (status === "draft") return "ส่งออก"
  if (status === "in_transit") return "ยืนยันรับ"
  return "ดูงาน"
}

export function TransferListTable({
  rows,
  detailBasePath = "/admin/inventory/transfer",
}: {
  rows: InvTransferRow[]
  detailBasePath?: string
}) {
  return (
    <>
      <div className="grid gap-3 md:hidden">
        {rows.length > 0 ? (
          rows.map((row) => (
            <div key={row.id} className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`${detailBasePath}/${row.id}`}
                    className="text-sm font-semibold text-brand-red hover:underline"
                  >
                    {row.id.slice(0, 8).toUpperCase()}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">{row.created_by_name}</p>
                </div>
                <StatusPill label={STATUS_LABELS[row.status]} variant={statusVariant(row.status)} />
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">ต้นทาง:</span> {row.from_branch_name} · {row.from_warehouse_name}
                </p>
                <p>
                  <span className="text-muted-foreground">ปลายทาง:</span> {row.to_branch_name} · {row.to_warehouse_name}
                </p>
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
              <div className="mt-3 rounded-lg border border-border/70 bg-muted/15 p-3 text-sm">
                <p className="font-medium">{nextStepCopy(row.status)}</p>
                {row.notes ? (
                  <p className="mt-1 line-clamp-2 text-muted-foreground">{row.notes}</p>
                ) : null}
              </div>
              <div className="mt-3 flex justify-end">
                <Link
                  href={`${detailBasePath}/${row.id}`}
                  className="inline-flex items-center gap-1 font-medium text-brand-red hover:underline"
                >
                  {actionLabel(row.status)}
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            ยังไม่มีใบโอนสินค้า
          </div>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>เลขที่</TableHead>
              <TableHead>ต้นทาง</TableHead>
              <TableHead>ปลายทาง</TableHead>
              <TableHead>ผู้สร้าง</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead>สร้างเมื่อ</TableHead>
              <TableHead className="text-right">รายการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    <Link href={`${detailBasePath}/${row.id}`} className="text-brand-red hover:underline">
                      {row.id.slice(0, 8).toUpperCase()}
                    </Link>
                  </TableCell>
                  <TableCell>{row.from_branch_name} · {row.from_warehouse_name}</TableCell>
                  <TableCell>{row.to_branch_name} · {row.to_warehouse_name}</TableCell>
                  <TableCell>{row.created_by_name}</TableCell>
                  <TableCell>
                    <StatusPill label={STATUS_LABELS[row.status]} variant={statusVariant(row.status)} />
                  </TableCell>
                  <TableCell>{formatThaiDate(row.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`${detailBasePath}/${row.id}`}
                      className="inline-flex items-center gap-1 font-medium text-brand-red hover:underline"
                    >
                      {row.item_count} รายการ
                      <ArrowUpRight className="size-3.5" aria-hidden />
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  ยังไม่มีใบโอนสินค้า
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
