import Link from "next/link"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { DataTableShell } from "@/components/brand/DataTableShell"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { listFefoOverrideAudit } from "@/features/inventory/actions/fefo"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"

export default async function InventoryFefoOverrideReportPage() {
  await requireInventoryPortal()
  const rows = await listFefoOverrideAudit(100)

  return (
    <AdminPageShell
      title="FEFO Override Audit"
      description={
        <Link href="/admin/inventory/reports" className="text-brand-red hover:underline">
          ← กลับรายงาน
        </Link>
      }
    >
      <DataTableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>วันที่</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Lot</TableHead>
              <TableHead className="text-right">จำนวน</TableHead>
              <TableHead>เหตุผล override</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? (
              rows.map((row) => {
                const reqItem = Array.isArray(row.inv_requisition_items)
                  ? row.inv_requisition_items[0]
                  : row.inv_requisition_items
                const sku = reqItem?.inv_skus
                  ? Array.isArray(reqItem.inv_skus)
                    ? reqItem.inv_skus[0]
                    : reqItem.inv_skus
                  : null
                const lot = Array.isArray(row.inv_stock_lots)
                  ? row.inv_stock_lots[0]
                  : row.inv_stock_lots
                return (
                  <TableRow key={row.id as string}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(row.created_at as string).toLocaleString("th-TH")}
                    </TableCell>
                    <TableCell>
                      {sku ? `${sku.code} — ${sku.name}` : "—"}
                    </TableCell>
                    <TableCell>
                      {lot
                        ? `${lot.lot_number}${lot.expiry_date ? ` (${lot.expiry_date})` : ""}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(row.qty_issued)}
                    </TableCell>
                    <TableCell className="max-w-md text-sm">{row.override_reason as string}</TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  ยังไม่มีรายการ FEFO override
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DataTableShell>
    </AdminPageShell>
  )
}
