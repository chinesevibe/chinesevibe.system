import Link from "next/link"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { buttonVariants } from "@/components/ui/button"
import { getInvRequisitionCreateOptions } from "@/features/inventory/actions/requisition"
import { RequisitionCreateForm } from "@/features/inventory/RequisitionCreateForm"
import { requireRole } from "@/lib/auth/require-role"
import { cn } from "@/lib/utils"

export default async function CreateRequisitionPage() {
  await requireRole("employee", "branch_manager", "hr", "inventory", "dev")
  const options = await getInvRequisitionCreateOptions()

  return (
    <AdminPageShell
      title="สร้างใบเบิกครัว"
      description="เลือกคลังและ SKU ที่ต้องการเบิก ระบบจะบันทึกเป็นหน่วยฐานของ SKU"
      action={
        <Link
          href="/admin/inventory/requisition"
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        >
          ← กลับ
        </Link>
      }
    >
      <RequisitionCreateForm options={options} />
    </AdminPageShell>
  )
}
