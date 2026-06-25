import Link from "next/link"
import { notFound } from "next/navigation"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { PortalInventoryTaskNav } from "@/components/portal/PortalInventoryTaskNav"
import { buttonVariants } from "@/components/ui/button"
import { StockCountDetailView } from "@/features/inventory/StockCountDetailView"
import { getStockCountDetail } from "@/features/inventory/actions/stock-count"
import { requireManagedInventoryPortal } from "@/lib/auth/require-inventory-portal"
import { cn } from "@/lib/utils"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function PortalStockCountDetailPage({ params }: PageProps) {
  await requireManagedInventoryPortal()

  const { id } = await params
  const detail = await getStockCountDetail(id)
  if (!detail) notFound()

  return (
    <AdminPageShell
      title="รายละเอียดรอบตรวจนับ"
      description={`${detail.count.branch_name} · ${detail.count.warehouse_name}`}
      action={
        <Link href="/portal/stock-count" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          ← รายการรอบตรวจนับ
        </Link>
      }
    >
      <PortalInventoryTaskNav current="stock-count" showManagerLinks />

      <StockCountDetailView detail={detail} canManage />
    </AdminPageShell>
  )
}
