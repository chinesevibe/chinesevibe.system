import Link from "next/link"
import { notFound } from "next/navigation"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { PortalInventoryTaskNav } from "@/components/portal/PortalInventoryTaskNav"
import { buttonVariants } from "@/components/ui/button"
import { getTransferDetail } from "@/features/inventory/actions/transfer"
import { TransferDetailView } from "@/features/inventory/TransferDetailView"
import { requireManagedInventoryPortal } from "@/lib/auth/require-inventory-portal"
import { cn } from "@/lib/utils"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function PortalTransferDetailPage({ params }: PageProps) {
  await requireManagedInventoryPortal()
  const { id } = await params
  const detail = await getTransferDetail(id)
  if (!detail) notFound()

  return (
    <AdminPageShell
      title="รายละเอียดใบโอน"
      description={`${detail.transfer.from_branch_name} → ${detail.transfer.to_branch_name}`}
      action={
        <Link href="/portal/transfer" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          ← รายการใบโอน
        </Link>
      }
    >
      <PortalInventoryTaskNav current="transfer" showManagerLinks />

      <TransferDetailView detail={detail} canManage />
    </AdminPageShell>
  )
}
