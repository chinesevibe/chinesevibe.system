import Link from "next/link"
import { notFound } from "next/navigation"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { buttonVariants } from "@/components/ui/button"
import { getDamageReportDetail } from "@/features/inventory/actions/consumption"
import { DamageDetailView } from "@/features/inventory/DamageDetailView"
import { canAccessInventoryPortal, canManageHr, isDev } from "@/lib/auth/roles"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"
import { cn } from "@/lib/utils"

type PageProps = {
  params: Promise<{ id: string }>
}

function canApproveInventory(role: Parameters<typeof canManageHr>[0]) {
  return role === "inventory" || isDev(role)
}

export default async function DamageDetailPage({ params }: PageProps) {
  const employee = await requireInventoryPortal()
  const { id } = await params
  const detail = await getDamageReportDetail(id)
  if (!detail) notFound()

  const canApproveNormal = canAccessInventoryPortal(employee)
  const canDecide =
    detail.approval_required_role === "inventory"
      ? canApproveInventory(employee.role)
      : canApproveNormal

  return (
    <AdminPageShell
      title="รายละเอียดความเสียหาย"
      description={`${detail.sku_code} — ${detail.sku_name}`}
      action={
        <Link
          href="/admin/inventory/damage"
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        >
          ← รายการ
        </Link>
      }
    >
      <DamageDetailView
        detail={detail}
        canApprove={canDecide}
        canReject={canDecide}
      />
    </AdminPageShell>
  )
}
