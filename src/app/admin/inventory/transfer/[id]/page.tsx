import Link from "next/link"
import { notFound } from "next/navigation"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { buttonVariants } from "@/components/ui/button"
import { getTransferDetail } from "@/features/inventory/actions/transfer"
import { TransferDetailView } from "@/features/inventory/TransferDetailView"
import { canAccessInventoryPortal } from "@/lib/auth/roles"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"
import { cn } from "@/lib/utils"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function InventoryTransferDetailPage({ params }: PageProps) {
  const employee = await requireInventoryPortal()
  const { id } = await params
  const detail = await getTransferDetail(id)
  if (!detail) notFound()
  const canManage = canAccessInventoryPortal(employee)

  return (
    <AdminPageShell
      title="รายละเอียดใบโอน"
      description={`${detail.transfer.from_branch_name} → ${detail.transfer.to_branch_name}`}
      action={
        <Link href="/admin/inventory/transfer" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          ← รายการใบโอน
        </Link>
      }
    >
      <TransferDetailView detail={detail} canManage={canManage} />
    </AdminPageShell>
  )
}
