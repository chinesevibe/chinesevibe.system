import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { InventoryAlertsPanel } from "@/features/inventory/InventoryAlertsPanel"
import { getInventoryAlerts } from "@/features/inventory/expansion-data"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"

type PageProps = {
  searchParams?: Promise<{ type?: "expiry" | "low_stock" | "anomaly" }>
}

export default async function InventoryAlertsPage({ searchParams }: PageProps) {
  await requireInventoryPortal()
  const params = await searchParams
  const rows = await getInventoryAlerts({ type: params?.type ?? "" })
  return (
    <AdminPageShell
      title="Inventory Alerts"
      description="แจ้งเตือน expiry, low stock และ anomaly พร้อมลิงก์ไปหน้าที่เกี่ยวข้อง"
    >
      <InventoryAlertsPanel rows={rows} />
    </AdminPageShell>
  )
}
