import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { getInventoryAlertCount } from "@/features/inventory/expansion-data"
import { InventoryHub } from "@/features/inventory/InventoryHub"
import { isInventoryPortalUser } from "@/lib/auth/roles"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"

export default async function AdminInventoryPage() {
  const employee = await requireInventoryPortal()
  const staffMode = isInventoryPortalUser(employee)
  const alertCount = await getInventoryAlertCount().catch(() => 0)

  return (
    <AdminPageShell
      title="คลังสินค้า"
      description="ภาพรวมงานคลังและทางลัดไปหน้าที่ใช้บ่อย"
    >
      <InventoryHub staffMode={staffMode} alertCount={alertCount} />
    </AdminPageShell>
  )
}
