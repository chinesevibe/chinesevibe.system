import { InventoryReportPage } from "@/features/inventory/InventoryReportPage"
import { parseInventoryFilters } from "@/features/inventory/inventory-filter-utils"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function InventoryReportRequisitionPage({ searchParams }: PageProps) {
  await requireInventoryPortal()
  return InventoryReportPage({
    kind: "requisition",
    title: "Requisition Report",
    description: "รายการเบิกสินค้าตามสาขาและสถานะ",
    filters: parseInventoryFilters(await searchParams),
  })
}
