import Link from "next/link"
import { notFound } from "next/navigation"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { buttonVariants } from "@/components/ui/button"
import { StockCountDetailView } from "@/features/inventory/StockCountDetailView"
import { getStockCountDetail } from "@/features/inventory/actions/stock-count"
import { canManageHr, isCeo, isDev } from "@/lib/auth/roles"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"
import { cn } from "@/lib/utils"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function InventoryStockCountDetailPage({ params }: PageProps) {
  const employee = await requireInventoryPortal()
  const canManage = canManageHr(employee.role) || isCeo(employee.role) || isDev(employee.role)
  if (!canManage) {
    notFound()
  }
  const { id } = await params
  const detail = await getStockCountDetail(id)
  if (!detail) notFound()

  return (
    <AdminPageShell
      title="รายละเอียดรอบตรวจนับ"
      description={`${detail.count.branch_name} · ${detail.count.warehouse_name}`}
      action={
        <Link href="/admin/inventory/stock-count" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          ← รายการรอบตรวจนับ
        </Link>
      }
    >
      <StockCountDetailView detail={detail} canManage={canManage} />
    </AdminPageShell>
  )
}
