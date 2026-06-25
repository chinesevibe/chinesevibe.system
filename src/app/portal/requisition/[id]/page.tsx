import Link from "next/link"
import { notFound } from "next/navigation"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { PortalInventoryTaskNav } from "@/components/portal/PortalInventoryTaskNav"
import { buttonVariants } from "@/components/ui/button"
import { getInvRequisitionDetail } from "@/features/inventory/actions/requisition"
import { RequisitionDetailView } from "@/features/inventory/RequisitionDetailView"
import { requireManagedInventoryPortal } from "@/lib/auth/require-inventory-portal"
import { cn } from "@/lib/utils"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function PortalRequisitionDetailPage({ params }: PageProps) {
  await requireManagedInventoryPortal()
  const { id } = await params
  const detail = await getInvRequisitionDetail(id)
  if (!detail) notFound()

  return (
    <AdminPageShell
      title="รายละเอียดใบเบิกครัว"
      description={`${detail.branch_name} → ${detail.warehouse_name}`}
      action={
        <Link href="/portal/requisition" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          ← รายการ
        </Link>
      }
    >
      <PortalInventoryTaskNav current="requisition" showManagerLinks />

      <RequisitionDetailView
        detail={detail}
        canManage
        canSubmit
        canReceive
      />
    </AdminPageShell>
  )
}
