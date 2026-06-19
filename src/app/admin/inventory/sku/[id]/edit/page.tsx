import Link from "next/link"
import { notFound } from "next/navigation"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { getInvSku, getInvUnits } from "@/features/inventory/actions/sku"
import { SkuForm } from "@/features/inventory/SkuForm"
import { canManageInventory, isCeo, isDev } from "@/lib/auth/roles"
import { requireInventoryMasterData } from "@/lib/auth/require-inventory-portal"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function EditSkuPage({ params }: PageProps) {
  const employee = await requireInventoryMasterData()
  const readOnly = isCeo(employee.role) && !isDev(employee.role)
  const { id } = await params

  const [sku, units] = await Promise.all([getInvSku(id), getInvUnits()])
  if (!sku) notFound()

  return (
    <AdminPageShell
      title={readOnly ? `ดู SKU — ${sku.code}` : `แก้ไข SKU — ${sku.code}`}
      description={
        <Link href="/admin/inventory/sku" className="text-brand-red hover:underline">
          ← กลับรายการ SKU
        </Link>
      }
    >
      <SkuForm
        mode="edit"
        initial={sku}
        units={units}
        readOnly={readOnly || !canManageInventory(employee)}
      />
    </AdminPageShell>
  )
}
