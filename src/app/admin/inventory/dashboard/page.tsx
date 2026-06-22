import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { InventoryExecutiveDashboard } from "@/features/inventory/InventoryExecutiveDashboard"
import {
  getInventoryAlerts,
  getInventoryDashboardData,
  getInventoryFilterOptions,
} from "@/features/inventory/expansion-data"
import { InventoryFilterBar } from "@/features/inventory/InventoryFilterBar"
import { parseInventoryFilters } from "@/features/inventory/inventory-filter-utils"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function InventoryDashboardPage({ searchParams }: PageProps) {
  await requireInventoryPortal()
  const filters = parseInventoryFilters(await searchParams)
  const [data, options, alerts] = await Promise.all([
    getInventoryDashboardData(filters),
    getInventoryFilterOptions(),
    getInventoryAlerts(filters).then((rows) => rows.slice(0, 6)),
  ])

  return (
    <AdminPageShell
      title="Inventory Dashboard"
      description="ติดตามงานด่วนวันนี้ แยกตามสาขาและคลัง ก่อนค่อยดู KPI และกราฟแนวโน้ม"
    >
      <div className="space-y-4">
        <InventoryFilterBar options={options} showDates />
        <InventoryExecutiveDashboard data={data} alerts={alerts} />
      </div>
    </AdminPageShell>
  )
}
