import Link from "next/link"
import { notFound } from "next/navigation"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
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
import { InventoryHub } from "@/features/inventory/InventoryHub"
import { InventoryLoadError } from "@/features/inventory/InventorySearchBar"
import { listStockCounts } from "@/features/inventory/actions/stock-count"
import { canManageInventory, isCeo, isDev } from "@/lib/auth/roles"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"
import { formatThaiDate, formatThaiDateTime } from "@/lib/datetime/thailand"
import { cn } from "@/lib/utils"

function statusVariant(status: "draft" | "counting" | "completed" | "cancelled") {
  if (status === "completed") return "approved" as const
  if (status === "counting") return "pending" as const
  if (status === "cancelled") return "rejected" as const
  return "neutral" as const
}

const STATUS_LABELS = {
  draft: "ร่าง",
  counting: "กำลังนับ",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
} as const

export default async function InventoryStockCountPage() {
  const employee = await requireInventoryPortal()
  if (!canManageInventory(employee) && !isCeo(employee.role) && !isDev(employee.role)) {
    notFound()
  }
  let rows: Awaited<ReturnType<typeof listStockCounts>> = []
  let loadError: string | null = null

  try {
    rows = await listStockCounts()
  } catch (error) {
    loadError = error instanceof Error ? error.message : "โหลดรอบตรวจนับไม่สำเร็จ"
  }

  return (
    <AdminPageShell
      title="ตรวจนับสต๊อก"
      description="สร้างแผนตรวจนับ บันทึกจำนวนจริง และ finalize เพื่อสร้าง stock adjustment อัตโนมัติ"
      action={
        <Link href="/admin/inventory/stock-count/create" className={cn(buttonVariants({ size: "sm" }))}>
          + สร้างรอบตรวจนับ
        </Link>
      }
    >
      {loadError ? <InventoryLoadError message={loadError} /> : null}

      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รหัส</TableHead>
              <TableHead>สาขา</TableHead>
              <TableHead>คลัง</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead>วันที่วางแผน</TableHead>
              <TableHead>ความคืบหน้า</TableHead>
              <TableHead>สร้างเมื่อ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  ยังไม่มีรอบตรวจนับ
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/inventory/stock-count/${row.id}`} className="text-brand-red hover:underline">
                      {row.id.slice(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell>{row.branch_name}</TableCell>
                  <TableCell>{row.warehouse_name}</TableCell>
                  <TableCell>
                    <StatusPill label={STATUS_LABELS[row.status]} variant={statusVariant(row.status)} />
                  </TableCell>
                  <TableCell>{row.planned_at ? formatThaiDate(row.planned_at) : "—"}</TableCell>
                  <TableCell>
                    {row.counted_count} / {row.item_count}
                  </TableCell>
                  <TableCell>{formatThaiDateTime(row.created_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4">
        <InventoryHub />
      </div>
    </AdminPageShell>
  )
}
