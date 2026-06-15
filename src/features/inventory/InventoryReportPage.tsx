import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { getInventoryReport, type InventoryReportKind } from "@/features/inventory/expansion-data"
import { InventoryReportTable } from "@/features/inventory/InventoryReportTable"

export async function InventoryReportPage({
  kind,
  title,
  description,
}: {
  kind: InventoryReportKind
  title: string
  description: string
}) {
  const result = await getInventoryReport(kind)
  return (
    <AdminPageShell title={title} description={description}>
      <InventoryReportTable
        title={title}
        filename={`inventory-${kind}.csv`}
        headers={result.headers}
        rows={result.rows}
        summary={result.summary}
      />
    </AdminPageShell>
  )
}
