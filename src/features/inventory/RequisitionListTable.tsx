import Link from "next/link"

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
}: {
  requisitions: InvRequisitionRow[]
}) {
  return (
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
                    href={`/admin/inventory/requisition/${row.id}`}
                    className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                  >
                    รายละเอียด
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
  )
}
