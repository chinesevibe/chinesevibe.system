import Link from "next/link"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
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
import {
  INBOUND_STATUS_LABELS,
  listInvInboundOrders,
} from "@/features/inventory/inbound-data"
import type { InvInboundStatus } from "@/features/inventory/types"
import { formatThaiDate } from "@/lib/datetime/thailand"
import { canAccessInventoryPortal, isCeo, isDev } from "@/lib/auth/roles"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"
import { cn } from "@/lib/utils"

function statusVariant(status: InvInboundStatus) {
  if (status === "approved") return "approved" as const
  if (status === "pending") return "pending" as const
  if (status === "cancelled") return "neutral" as const
  return "neutral" as const
}

export default async function InventoryInboundPage() {
  const employee = await requireInventoryPortal()
  const readOnly = isCeo(employee.role) && !isDev(employee.role)
  const canManage = canAccessInventoryPortal(employee)

  let loadError: string | null = null
  let orders: Awaited<ReturnType<typeof listInvInboundOrders>> = []

  try {
    orders = await listInvInboundOrders()
  } catch (error) {
    loadError = error instanceof Error ? error.message : "โหลดใบรับเข้าไม่สำเร็จ"
  }

  return (
    <AdminPageShell
      title="รับเข้าสินค้า (Inbound)"
      description={
        readOnly
          ? "ดูใบรับเข้า (read-only)"
          : "สร้างใบรับเข้า → คลังสแกน barcode → Inventory ตรวจอนุมัติ → เพิ่มสต็อก"
      }
      action={
        canManage ? (
          <Link
            href="/admin/inventory/inbound/new"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            + สร้างใบรับเข้า
          </Link>
        ) : undefined
      }
    >
      {loadError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : null}

      <DataTableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>วันที่</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>คลัง</TableHead>
              <TableHead>รายการ</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">ดู</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length > 0 ? (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{formatThaiDate(order.created_at)}</TableCell>
                  <TableCell>{order.supplier_name}</TableCell>
                  <TableCell>{order.warehouse_name}</TableCell>
                  <TableCell>{order.item_count}</TableCell>
                  <TableCell>
                    <StatusPill
                      label={INBOUND_STATUS_LABELS[order.status]}
                      variant={statusVariant(order.status)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/inventory/inbound/${order.id}`}
                      className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                    >
                      รายละเอียด
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  ยังไม่มีใบรับเข้า
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DataTableShell>
    </AdminPageShell>
  )
}
