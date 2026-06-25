import Link from "next/link"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { PortalInventoryTaskNav } from "@/components/portal/PortalInventoryTaskNav"
import { buttonVariants } from "@/components/ui/button"
import { getInvRequisitionCreateOptions } from "@/features/inventory/actions/requisition"
import { RequisitionCreateForm } from "@/features/inventory/RequisitionCreateForm"
import { requireManagedInventoryPortal } from "@/lib/auth/require-inventory-portal"
import { cn } from "@/lib/utils"

export default async function PortalCreateRequisitionPage() {
  await requireManagedInventoryPortal()
  const options = await getInvRequisitionCreateOptions()

  return (
    <AdminPageShell
      title="สร้างใบเบิกครัว"
      description="เลือกคลังและ SKU ที่ต้องการเบิกจากมือถือ แล้วติดตามสถานะต่อในหน้ามือถือ"
      action={
        <Link href="/portal/requisition" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          ← กลับ
        </Link>
      }
    >
      <PortalInventoryTaskNav current="requisition" showManagerLinks />

      <RequisitionCreateForm
        options={options}
        successBasePath="/portal/requisition"
        cancelPath="/portal/requisition"
      />
    </AdminPageShell>
  )
}
