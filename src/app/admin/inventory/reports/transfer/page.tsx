import { InventoryReportPage } from "@/features/inventory/InventoryReportPage"
import { parseInventoryFilters } from "@/features/inventory/inventory-filter-utils"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function InventoryReportTransferPage({ searchParams }: PageProps) {
  await requireInventoryPortal()
  return InventoryReportPage({
    kind: "transfer",
    title: "Transfer Report",
    description: "รายการโอนสินค้าระหว่างคลัง",
    filters: parseInventoryFilters(await searchParams),
  })
}
