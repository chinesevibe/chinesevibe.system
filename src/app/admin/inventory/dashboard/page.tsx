import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { InventoryExecutiveDashboard } from "@/features/inventory/InventoryExecutiveDashboard"
import { getInventoryDashboardData } from "@/features/inventory/expansion-data"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"

export default async function InventoryDashboardPage() {
  await requireInventoryPortal()
  const data = await getInventoryDashboardData()
  return (
    <AdminPageShell
      title="Inventory Dashboard"
      description="KPI และกราฟแนวโน้มของคลังสินค้าแบบภาพรวม"
    >
      <InventoryExecutiveDashboard data={data} />
    </AdminPageShell>
  )
}
