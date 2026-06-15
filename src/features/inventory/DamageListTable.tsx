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
import type {
  InvDamageApprovalRole,
  InvDamageRow,
  InvDamageStatus,
} from "@/features/inventory/types"
import { formatThaiDate } from "@/lib/datetime/thailand"
import { cn } from "@/lib/utils"

export const DAMAGE_STATUS_LABELS: Record<InvDamageStatus, string> = {
  pending: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ปฏิเสธ",
}

export const DAMAGE_APPROVAL_ROLE_LABELS: Record<
  InvDamageApprovalRole,
  string
> = {
  auto: "อัตโนมัติ",
  hr: "ต้อง HR",
  inventory: "ต้อง Inventory",
}

function statusVariant(status: InvDamageStatus) {
  if (status === "approved") return "approved" as const
  if (status === "pending") return "pending" as const
  return "neutral" as const
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)))
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function unitLabel(row: InvDamageRow) {
  if (!row.unit_name) return ""
  return row.unit_abbreviation
    ? `${row.unit_name} (${row.unit_abbreviation})`
    : row.unit_name
}

export function DamageListTable({ damages }: { damages: InvDamageRow[] }) {
  return (
    <DataTableShell>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>วันที่</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>สาขา</TableHead>
            <TableHead>คลัง</TableHead>
            <TableHead>ประเภท</TableHead>
            <TableHead>จำนวน</TableHead>
            <TableHead>มูลค่า</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead className="text-right">ดู</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {damages.length > 0 ? (
            damages.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{formatThaiDate(row.created_at)}</TableCell>
                <TableCell>
                  <div className="font-medium">{row.sku_code}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.sku_name}
                  </div>
                </TableCell>
                <TableCell>{row.branch_name}</TableCell>
                <TableCell>{row.warehouse_name}</TableCell>
                <TableCell>{row.damage_type}</TableCell>
                <TableCell>
                  {formatQuantity(row.qty)} {unitLabel(row)}
                </TableCell>
                <TableCell>{formatMoney(row.cost_value)} บาท</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <StatusPill
                      label={DAMAGE_STATUS_LABELS[row.status]}
                      variant={statusVariant(row.status)}
                    />
                    {row.status === "pending" ? (
                      <span className="text-xs text-muted-foreground">
                        {DAMAGE_APPROVAL_ROLE_LABELS[row.approval_required_role]}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/admin/inventory/damage/${row.id}`}
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
                colSpan={9}
                className="py-8 text-center text-muted-foreground"
              >
                ยังไม่มีรายงานความเสียหาย
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </DataTableShell>
  )
}
