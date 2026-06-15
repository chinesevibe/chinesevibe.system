import { AdminPageShell } from "@/components/brand/AdminPageShell"
import {
  getInventoryFilterOptions,
  getInventoryReport,
  type InventoryReportKind,
} from "@/features/inventory/expansion-data"
import { InventoryFilterBar } from "@/features/inventory/InventoryFilterBar"
import { InventoryReportTable } from "@/features/inventory/InventoryReportTable"
import type { InventoryPageFilters } from "@/features/inventory/inventory-filter-utils"

export async function InventoryReportPage({
  kind,
  title,
  description,
  filters = {},
}: {
  kind: InventoryReportKind
  title: string
  description: string
  filters?: InventoryPageFilters
}) {
  const [result, options] = await Promise.all([
    getInventoryReport(kind, filters),
    getInventoryFilterOptions(),
  ])

  return (
    <AdminPageShell title={title} description={description}>
      <div className="space-y-4">
        <InventoryFilterBar options={options} showDates />
        <InventoryReportTable
          title={title}
          filename={`inventory-${kind}.csv`}
          headers={result.headers}
          rows={result.rows}
          summary={result.summary}
        />
      </div>
    </AdminPageShell>
  )
}
