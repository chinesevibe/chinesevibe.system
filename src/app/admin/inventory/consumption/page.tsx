import Link from "next/link"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { buttonVariants } from "@/components/ui/button"
import { getConsumptionCreateOptions } from "@/features/inventory/actions/consumption"
import { ConsumptionRecordForm } from "@/features/inventory/ConsumptionRecordForm"
import { requireRole } from "@/lib/auth/require-role"
import { cn } from "@/lib/utils"

export default async function InventoryConsumptionPage() {
  await requireRole("employee", "branch_manager", "hr", "inventory", "dev")
  const options = await getConsumptionCreateOptions()

  return (
    <AdminPageShell
      title="บันทึกการใช้จริง"
      description="บันทึกการใช้วัตถุดิบสำหรับ production, sampling และ testing พร้อมตัดสต็อกทันที"
      action={
        <Link
          href="/admin/inventory/damage"
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        >
          รายงานความเสียหาย
        </Link>
      }
    >
      <ConsumptionRecordForm options={options} />
    </AdminPageShell>
  )
}
