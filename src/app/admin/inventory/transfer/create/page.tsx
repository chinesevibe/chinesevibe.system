import Link from "next/link"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { buttonVariants } from "@/components/ui/button"
import { getTransferCreateOptions } from "@/features/inventory/actions/transfer"
import { TransferCreateForm } from "@/features/inventory/TransferCreateForm"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"
import { cn } from "@/lib/utils"

export default async function InventoryTransferCreatePage() {
  await requireInventoryPortal()
  const options = await getTransferCreateOptions()
  return (
    <AdminPageShell
      title="สร้างใบโอนสินค้า"
      description="สาขาต้นทางส่งก่อน แล้วปลายทางรับเข้าภายหลัง"
      action={
        <Link href="/admin/inventory/transfer" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          ← รายการใบโอน
        </Link>
      }
    >
      <TransferCreateForm options={options} />
    </AdminPageShell>
  )
}
