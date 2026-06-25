import Link from "next/link"
import { notFound } from "next/navigation"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { PortalInventoryTaskNav } from "@/components/portal/PortalInventoryTaskNav"
import { buttonVariants } from "@/components/ui/button"
import { getDamageReportDetail } from "@/features/inventory/actions/consumption"
import { DamageDetailView } from "@/features/inventory/DamageDetailView"
import {
  canAccessInventoryPortal,
  hasHrInventoryAccess,
  isDev,
  isInventoryRole,
} from "@/lib/auth/roles"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"
import { cn } from "@/lib/utils"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function PortalDamageDetailPage({ params }: PageProps) {
  const employee = await requireInventoryPortal()
  const { id } = await params
  const detail = await getDamageReportDetail(id)
  if (!detail) notFound()

  const canApproveNormal = canAccessInventoryPortal(employee)
  const canDecide =
    detail.approval_required_role === "inventory"
      ? isInventoryRole(employee.role) ||
        isDev(employee.role) ||
        hasHrInventoryAccess(employee)
      : canApproveNormal

  return (
    <AdminPageShell
      title="รายละเอียดความเสียหาย"
      description={`${detail.sku_code} — ${detail.sku_name}`}
      action={
        <Link href="/portal/damage" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          ← รายการ
        </Link>
      }
    >
      <PortalInventoryTaskNav current="damage" showManagerLinks />

      <DamageDetailView
        detail={detail}
        canApprove={canDecide}
        canReject={canDecide}
      />
    </AdminPageShell>
  )
}
