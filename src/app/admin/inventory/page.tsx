import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { InventoryHub } from "@/features/inventory/InventoryHub"
import { isInventoryPortalUser } from "@/lib/auth/roles"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"

export default async function AdminInventoryPage() {
  const employee = await requireInventoryPortal()
  const staffMode = isInventoryPortalUser(employee)

  return (
    <AdminPageShell title="คลังสินค้า">
      <InventoryHub staffMode={staffMode} />
    </AdminPageShell>
  )
}
