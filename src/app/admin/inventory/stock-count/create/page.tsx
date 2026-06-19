import Link from "next/link"
import { notFound } from "next/navigation"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { buttonVariants } from "@/components/ui/button"
import {
  getStockCountCreateOptions,
} from "@/features/inventory/actions/stock-count"
import { StockCountCreateForm } from "@/features/inventory/StockCountCreateForm"
import { canManageInventory, isCeo, isDev } from "@/lib/auth/roles"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"
import { cn } from "@/lib/utils"

export default async function InventoryStockCountCreatePage() {
  const employee = await requireInventoryPortal()
  if (!canManageInventory(employee) && !isCeo(employee.role) && !isDev(employee.role)) {
    notFound()
  }
  const options = await getStockCountCreateOptions()

  return (
    <AdminPageShell
      title="สร้างรอบตรวจนับสต๊อก"
      description="เลือกรอบตรวจนับตามคลัง แล้วระบบจะ snapshot จำนวน system ปัจจุบันให้ทันที"
      action={
        <Link href="/admin/inventory/stock-count" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          ← รายการรอบตรวจนับ
        </Link>
      }
    >
      <StockCountCreateForm options={options} />
    </AdminPageShell>
  )
}
