import Link from "next/link"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { buttonVariants } from "@/components/ui/button"
import { getDamageCreateOptions } from "@/features/inventory/actions/consumption"
import { DamageCreateForm } from "@/features/inventory/DamageCreateForm"
import { requireRole } from "@/lib/auth/require-role"
import { cn } from "@/lib/utils"

export default async function CreateDamageReportPage() {
  await requireRole("employee", "branch_manager", "hr", "admin", "dev")
  const options = await getDamageCreateOptions()

  return (
    <AdminPageShell
      title="แจ้งความเสียหาย"
      description="บันทึกของเสีย สูญหาย หมดอายุ หรือรายการปรับปรุง พร้อมรูปแนบและเหตุผล"
      action={
        <Link
          href="/admin/inventory/damage"
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        >
          ← รายการ
        </Link>
      }
    >
      <DamageCreateForm options={options} />
    </AdminPageShell>
  )
}
