import { InventoryReportPage } from "@/features/inventory/InventoryReportPage"
import { parseInventoryFilters } from "@/features/inventory/inventory-filter-utils"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function InventoryReportVariancePage({ searchParams }: PageProps) {
  await requireInventoryPortal()
  return InventoryReportPage({
    kind: "variance",
    title: "Stock Count Variance Report",
    description: "เปรียบเทียบยอดระบบกับยอดนับจริง",
    filters: parseInventoryFilters(await searchParams),
  })
}
