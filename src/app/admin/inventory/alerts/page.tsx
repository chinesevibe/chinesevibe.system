import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { InventoryAlertsPanel } from "@/features/inventory/InventoryAlertsPanel"
import {
  getInventoryAlerts,
  getInventoryFilterOptions,
} from "@/features/inventory/expansion-data"
import { InventoryFilterBar } from "@/features/inventory/InventoryFilterBar"
import { parseInventoryFilters } from "@/features/inventory/inventory-filter-utils"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function InventoryAlertsPage({ searchParams }: PageProps) {
  await requireInventoryPortal()
  const params = await searchParams
  const filters = parseInventoryFilters(params)
  const [rows, options] = await Promise.all([
    getInventoryAlerts(filters),
    getInventoryFilterOptions(),
  ])

  return (
    <AdminPageShell
      title="Inventory Alerts"
      description="แจ้งเตือน expiry, low stock และ anomaly พร้อมลิงก์ไปหน้าที่เกี่ยวข้อง"
    >
      <div className="space-y-4">
        <InventoryFilterBar options={options} showType />
        <InventoryAlertsPanel rows={rows} />
      </div>
    </AdminPageShell>
  )
}
