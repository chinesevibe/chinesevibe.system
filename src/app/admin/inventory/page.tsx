import { AdminPageShell } from "@/components/brand/AdminPageShell"
import {
  getInventoryAlertCount,
  getInventoryAlerts,
} from "@/features/inventory/expansion-data"
import { InventoryHub } from "@/features/inventory/InventoryHub"
import { isInventoryPortalUser } from "@/lib/auth/roles"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"

export default async function AdminInventoryPage() {
  const employee = await requireInventoryPortal()
  const staffMode = isInventoryPortalUser(employee)
  const [alertCount, alerts] = await Promise.all([
    getInventoryAlertCount().catch(() => 0),
    getInventoryAlerts({}).then((rows) => rows.slice(0, 5)).catch(() => []),
  ])

  return (
    <AdminPageShell
      title="Inventory Workspace"
      description="พื้นที่ทำงานหลักของคลังสินค้า ดูงานด่วนวันนี้ เปิดงานประจำ และเข้าถึงข้อมูลหลักจากจุดเดียว"
    >
      <InventoryHub
        staffMode={staffMode}
        alertCount={alertCount}
        alerts={alerts}
      />
    </AdminPageShell>
  )
}
