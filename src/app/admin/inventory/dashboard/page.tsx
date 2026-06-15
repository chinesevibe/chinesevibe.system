import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { InventoryExecutiveDashboard } from "@/features/inventory/InventoryExecutiveDashboard"
import {
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
  const [data, options] = await Promise.all([
    getInventoryDashboardData(filters),
    getInventoryFilterOptions(),
  ])

  return (
    <AdminPageShell
      title="Inventory Dashboard"
      description="KPI และกราฟแนวโน้มของคลังสินค้าแบบภาพรวม"
    >
      <div className="space-y-4">
        <InventoryFilterBar options={options} showDates />
        <InventoryExecutiveDashboard data={data} />
      </div>
    </AdminPageShell>
  )
}
