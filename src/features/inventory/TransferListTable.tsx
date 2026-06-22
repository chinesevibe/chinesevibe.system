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

export function TransferListTable({ rows }: { rows: InvTransferRow[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
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
                  <Link href={`/admin/inventory/transfer/${row.id}`} className="text-brand-red hover:underline">
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
                    href={`/admin/inventory/transfer/${row.id}`}
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
  )
}
