import Link from "next/link"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { PortalInventoryTaskNav } from "@/components/portal/PortalInventoryTaskNav"
import { buttonVariants } from "@/components/ui/button"
import { getTransferCreateOptions } from "@/features/inventory/actions/transfer"
import { TransferCreateForm } from "@/features/inventory/TransferCreateForm"
import { requireManagedInventoryPortal } from "@/lib/auth/require-inventory-portal"
import { cn } from "@/lib/utils"

export default async function PortalTransferCreatePage() {
  await requireManagedInventoryPortal()
  const options = await getTransferCreateOptions()
  return (
    <AdminPageShell
      title="สร้างใบโอนสินค้า"
      description="สาขาต้นทางส่งก่อน แล้วปลายทางรับเข้าภายหลัง ผ่านขั้นตอนงานบนมือถือ"
      action={
        <Link href="/portal/transfer" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          ← รายการใบโอน
        </Link>
      }
    >
      <PortalInventoryTaskNav current="transfer" showManagerLinks />

      <TransferCreateForm options={options} successBasePath="/portal/transfer" />
    </AdminPageShell>
  )
}
