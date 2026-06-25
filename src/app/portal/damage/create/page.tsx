import Link from "next/link"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { PortalInventoryTaskNav } from "@/components/portal/PortalInventoryTaskNav"
import { buttonVariants } from "@/components/ui/button"
import { getDamageCreateOptions } from "@/features/inventory/actions/consumption"
import { DamageCreateForm } from "@/features/inventory/DamageCreateForm"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"
import { cn } from "@/lib/utils"

export default async function PortalCreateDamageReportPage() {
  await requireInventoryPortal()
  const options = await getDamageCreateOptions()

  return (
    <AdminPageShell
      title="แจ้งความเสียหาย"
      description="บันทึกของเสีย สูญหาย หมดอายุ หรือรายการปรับปรุงผ่านหน้ามือถือ"
      action={
        <Link href="/portal/damage" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          ← รายการ
        </Link>
      }
    >
      <PortalInventoryTaskNav current="damage" showManagerLinks />

      <DamageCreateForm options={options} successBasePath="/portal/damage" />
    </AdminPageShell>
  )
}
