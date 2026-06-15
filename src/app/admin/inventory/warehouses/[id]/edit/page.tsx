import Link from "next/link"
import { notFound } from "next/navigation"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { getInvBranches } from "@/features/inventory/actions/branch"
import { getInvWarehouse } from "@/features/inventory/actions/warehouse"
import { WarehouseForm } from "@/features/inventory/WarehouseForm"
import { canManageHr, isCeo, isDev } from "@/lib/auth/roles"
import { requireInventoryMasterData } from "@/lib/auth/require-inventory-portal"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function EditWarehousePage({ params }: PageProps) {
  const employee = await requireInventoryMasterData()
  const readOnly = isCeo(employee.role) && !isDev(employee.role)
  const { id } = await params

  const [warehouse, branches] = await Promise.all([
    getInvWarehouse(id),
    getInvBranches(),
  ])
  if (!warehouse) notFound()

  const activeBranches = branches.filter((b) => b.is_active || b.id === warehouse.branch_id)

  return (
    <AdminPageShell
      title={
        readOnly ? `ดูคลัง — ${warehouse.code}` : `แก้ไขคลัง — ${warehouse.code}`
      }
      description={
        <Link href="/admin/inventory/warehouses" className="text-brand-red hover:underline">
          ← กลับรายการคลัง
        </Link>
      }
    >
      <WarehouseForm
        mode="edit"
        initial={warehouse}
        branches={activeBranches}
        readOnly={readOnly || !canManageHr(employee.role)}
      />
    </AdminPageShell>
  )
}
