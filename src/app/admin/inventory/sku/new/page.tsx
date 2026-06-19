import Link from "next/link"
import { redirect } from "next/navigation"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { getInvUnits } from "@/features/inventory/actions/sku"
import { SkuForm } from "@/features/inventory/SkuForm"
import { canManageInventory } from "@/lib/auth/roles"
import { requireInventoryMasterData } from "@/lib/auth/require-inventory-portal"

export default async function NewSkuPage() {
  const employee = await requireInventoryMasterData()
  if (!canManageInventory(employee)) {
    redirect("/admin/inventory/sku")
  }

  const units = await getInvUnits()

  return (
    <AdminPageShell
      title="สร้าง SKU"
      description={
        <Link href="/admin/inventory/sku" className="text-brand-red hover:underline">
          ← กลับรายการ SKU
        </Link>
      }
    >
      <SkuForm mode="create" units={units} />
    </AdminPageShell>
  )
}
