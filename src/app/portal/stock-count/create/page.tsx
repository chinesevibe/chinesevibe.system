import Link from "next/link"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { PortalInventoryTaskNav } from "@/components/portal/PortalInventoryTaskNav"
import { buttonVariants } from "@/components/ui/button"
import { getStockCountCreateOptions } from "@/features/inventory/actions/stock-count"
import { StockCountCreateForm } from "@/features/inventory/StockCountCreateForm"
import { requireManagedInventoryPortal } from "@/lib/auth/require-inventory-portal"
import { cn } from "@/lib/utils"

export default async function PortalStockCountCreatePage() {
  await requireManagedInventoryPortal()

  const options = await getStockCountCreateOptions()

  return (
    <AdminPageShell
      title="สร้างรอบตรวจนับสต๊อก"
      description="เริ่มรอบตรวจนับจากมือถือ แล้วค่อยเปิดรายละเอียดรอบตรวจนับต่อ"
      action={
        <Link href="/portal/inventory" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          ← กลับหน้าคลัง
        </Link>
      }
    >
      <PortalInventoryTaskNav current="stock-count" showManagerLinks />

      <StockCountCreateForm options={options} successBasePath="/portal/stock-count" />
    </AdminPageShell>
  )
}
